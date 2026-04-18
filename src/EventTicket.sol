//SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC2981} from "@openzeppelin/contracts/token/common/ERC2981.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract EventTicket is ERC721, ERC2981, Ownable {
    using Strings for uint256;

    // ── Custom errors ─────────────────────────────────────────────────────────
    error EventTicket__EventDoesNotExist(uint256 eventId);
    error EventTicket__EventSoldOut(uint256 eventId);
    error EventTicket__InsufficientPayment(uint256 sent, uint256 required);
    error EventTicket__TicketAlreadyUsed(uint256 tokenId);
    error EventTicket__ResaleNotAllowed();
    error EventTicket__ResalePriceExceedsCap(uint256 price, uint256 cap);
    error EventTicket__NotTicketOwner(uint256 tokenId);
    error EventTicket__NotListed(uint256 tokenId);
    error EventTicket__TicketPriceMustBeGreaterThanZero();
    error EventTicket__MaxSupplyMustBeGreaterThanZero();
    error EventTicket__EventDateMustBeInTheFuture();
    error EventTicket__NotAuthorizedToScan(uint256 eventId);
    error EventTicket__NotEventOrganizer(uint256 eventId);
    error EventTicket__InvalidEventStatus(uint256 eventId);
    error EventTicket__FundsNotYetReleasable();
    error EventTicket__InsufficientAllowance();
    error EventTicket__FundsAlreadyClaimed();
    error EventTicket__EventAlreadyOccurred(uint256 eventId);

    // ── Data structures ───────────────────────────────────────────────────────
    enum EventStatus {
        UPCOMING,
        CANCELLED,
        COMPLETED
    }

    struct Event {
        string name;
        string venue;
        address organizer;
        uint256 escrowBalance;
        uint256 date;
        uint256 price;
        EventStatus status;
        uint256 maxSupply; // Total tickets
        uint256 minted; // Tickets minted so far
        bool resaleAllowed;
        address royaltyReceiver;
        uint256 resalePriceCap; // Max resale price
        uint96 royaltyFeeBps; // 500 = 5 %
        string imageURI; // Base URI for on-chain metadata (optional)
    }

    struct Ticket {
        uint256 eventId;
        uint256 seatNumber;
        bool used;
        uint256 resalePrice;
        bool refundClaimed;
    }

    // ── State ─────────────────────────────────────────────────────────────────
    uint256 public nextEventId;
    uint256 private _nextTokenId;
    uint256 public immutable RELEASE_DELAY;
    IERC20 public immutable usdc;

    mapping(uint256 => Event) public events; // eventId => Event
    mapping(uint256 => Ticket) public tickets; // tokenId => Ticket
    mapping(uint256 eventId => mapping(address account => bool approved)) private _validators;

    // Lets buyResaleTicket() bypass the transfer hook without a full reentrancy risk
    bool private _resaleInProgress;

    // ── Constructor ───────────────────────────────────────────────────────────
    constructor(address initialOwner, address _usdc, uint256 _releaseDelay)
        ERC721("EventTicket", "ETK")
        Ownable(initialOwner)
    {
        RELEASE_DELAY = _releaseDelay;
        usdc = IERC20(_usdc);
    }

    // ── Modifier ──────────────────────────────────────────────────────────────
    modifier onlyOrganizer(uint256 eventId) {
        if (eventId >= nextEventId) revert EventTicket__EventDoesNotExist(eventId);
        // check msg.sender == events[eventId].organizer
        if (msg.sender != events[eventId].organizer) {
            revert EventTicket__NotEventOrganizer(eventId);
        }
        _;
    }

    modifier canScan(uint256 eventId) {
        if (eventId >= nextEventId) revert EventTicket__EventDoesNotExist(eventId);
        // check msg.sender is either the organizer OR an approved validator
        if (
            msg.sender != events[eventId].organizer /* organizer can always scan */
                && !_validators[eventId][msg.sender] /* approved validators can scan */
        ) {
            revert EventTicket__NotAuthorizedToScan(eventId);
        }
        _;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ORGANIZER (admin) Functions
    // ─────────────────────────────────────────────────────────────────────────

    function createEvent(
        string calldata name,
        string calldata venue,
        uint256 date,
        uint256 price,
        uint256 maxSupply,
        bool resaleAllowed,
        uint256 resalePriceCap,
        address royaltyReceiver,
        uint96 royaltyFeeBps,
        string calldata imageURI
    ) external returns (uint256 eventId) {
        if (price == 0) {
            revert EventTicket__TicketPriceMustBeGreaterThanZero();
        }

        if (maxSupply == 0) {
            revert EventTicket__MaxSupplyMustBeGreaterThanZero();
        }

        if (block.timestamp >= date) {
            revert EventTicket__EventDateMustBeInTheFuture();
        }

        eventId = nextEventId++;
        events[eventId] = Event({
            name: name,
            venue: venue,
            organizer: msg.sender,
            escrowBalance: 0,
            date: date,
            price: price,
            status: EventStatus.UPCOMING,
            maxSupply: maxSupply,
            minted: 0,
            resaleAllowed: resaleAllowed,
            resalePriceCap: resalePriceCap,
            royaltyReceiver: royaltyReceiver,
            royaltyFeeBps: royaltyFeeBps,
            imageURI: imageURI
        });

        return eventId;
    }

    /// @notice add a validator (e.g. event staff) who can scan tickets at the entrance
    function addValidator(uint256 eventId, address validator) external onlyOrganizer(eventId) {
        // set validator as approved for this eventId
        _validators[eventId][validator] = true;
    }

    /// @notice remove a validator's access to scan tickets for this event
    function removeValidator(uint256 eventId, address validator) external onlyOrganizer(eventId) {
        // revoke validator's approval for this eventId
        _validators[eventId][validator] = false;
    }

    /// @notice scan and invalidate a ticket at the event entrance
    function useTicket(uint256 tokenId) external canScan(tickets[tokenId].eventId) {
        if (tickets[tokenId].used) {
            revert EventTicket__TicketAlreadyUsed(tokenId);
        }
        tickets[tokenId].used = true;
    }

    /// @notice withdraw funds from ticket sales after the event
    function claimFunds(uint256 eventId) external onlyOrganizer(eventId) {
        if (events[eventId].status != EventStatus.UPCOMING) {
            revert EventTicket__InvalidEventStatus(eventId);
        }

        if (block.timestamp < events[eventId].date + RELEASE_DELAY) {
            revert EventTicket__FundsNotYetReleasable();
        }

        uint256 amount = events[eventId].escrowBalance;
        events[eventId].escrowBalance = 0; // prevent reentrancy
        events[eventId].status = EventStatus.COMPLETED; // mark event as completed
        usdc.transfer(msg.sender, amount);
    }

    function cancelEvent(uint256 eventId) external onlyOrganizer(eventId) {
        if (block.timestamp >= events[eventId].date) {
            revert EventTicket__EventAlreadyOccurred(eventId);
        }
        if (events[eventId].status != EventStatus.UPCOMING) {
            revert EventTicket__InvalidEventStatus(eventId);
        }
        events[eventId].status = EventStatus.CANCELLED;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // BUYER Functions
    // ─────────────────────────────────────────────────────────────────────────
    function mintTicket(uint256 eventId) external {
        if (eventId >= nextEventId) revert EventTicket__EventDoesNotExist(eventId);
        if (events[eventId].status != EventStatus.UPCOMING) {
            revert EventTicket__InvalidEventStatus(eventId);
        }
        if (events[eventId].minted >= events[eventId].maxSupply) {
            revert EventTicket__EventSoldOut(eventId);
        }
        if (usdc.balanceOf(msg.sender) < events[eventId].price) {
            revert EventTicket__InsufficientPayment(usdc.balanceOf(msg.sender), events[eventId].price);
        }
        if (usdc.allowance(msg.sender, address(this)) < events[eventId].price) {
            revert EventTicket__InsufficientAllowance();
        }

        uint256 tokenId = _nextTokenId++;
        events[eventId].minted++;
        events[eventId].escrowBalance += events[eventId].price;
        tickets[tokenId] = Ticket({
            eventId: eventId, seatNumber: events[eventId].minted, used: false, resalePrice: 0, refundClaimed: false
        });

        // transfer of USDC from buyer to contract
        usdc.transferFrom(msg.sender, address(this), events[eventId].price);

        // mint the ticket NFT to the buyer
        _safeMint(msg.sender, tokenId);
    }

    function claimRefund(uint256 tokenId) external {
        if (events[tickets[tokenId].eventId].status != EventStatus.CANCELLED) {
            revert EventTicket__InvalidEventStatus(tickets[tokenId].eventId);
        }
        if (tickets[tokenId].refundClaimed) {
            revert EventTicket__FundsAlreadyClaimed();
        }
        if (ownerOf(tokenId) != msg.sender) {
            revert EventTicket__NotTicketOwner(tokenId);
        }

        tickets[tokenId].refundClaimed = true; // prevent reentrancy

        uint256 refundAmount = events[tickets[tokenId].eventId].price;
        events[tickets[tokenId].eventId].escrowBalance -= refundAmount;

        usdc.transfer(msg.sender, refundAmount);
        _burn(tokenId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SECONDARY MARKET (resale) Functions
    // ─────────────────────────────────────────────────────────────────────────

    function listForResale(uint256 tokenId, uint256 price) external {
        if (price == 0) {
            revert EventTicket__TicketPriceMustBeGreaterThanZero();
        }

        if (tickets[tokenId].used) {
            revert EventTicket__TicketAlreadyUsed(tokenId);
        }

        if (events[tickets[tokenId].eventId].status != EventStatus.UPCOMING) {
            revert EventTicket__InvalidEventStatus(tickets[tokenId].eventId);
        }

        if (ownerOf(tokenId) != msg.sender) {
            revert EventTicket__NotTicketOwner(tokenId);
        }

        Event storage evnt = events[tickets[tokenId].eventId];
        if (!evnt.resaleAllowed) {
            revert EventTicket__ResaleNotAllowed();
        }

        if (evnt.resalePriceCap > 0 && price > evnt.resalePriceCap) {
            revert EventTicket__ResalePriceExceedsCap(price, evnt.resalePriceCap);
        }

        tickets[tokenId].resalePrice = price;
    }

    function buyResaleTicket(uint256 tokenId) external {
        Ticket storage ticket = tickets[tokenId];

        if (events[ticket.eventId].status != EventStatus.UPCOMING) {
            revert EventTicket__InvalidEventStatus(ticket.eventId);
        }

        if (ticket.resalePrice == 0) {
            revert EventTicket__NotListed(tokenId);
        }

        if (usdc.balanceOf(msg.sender) < ticket.resalePrice) {
            revert EventTicket__InsufficientPayment(usdc.balanceOf(msg.sender), ticket.resalePrice);
        }
        if (usdc.allowance(msg.sender, address(this)) < ticket.resalePrice) {
            revert EventTicket__InsufficientAllowance();
        }

        address seller = ownerOf(tokenId);
        uint256 price = ticket.resalePrice;

        // Reset resale price before transfer to prevent reentrancy issues
        ticket.resalePrice = 0;

        // fetch royalty info from event data
        (address royaltyReceiver, uint256 royaltyAmount) = royaltyInfo(tokenId, price);

        // transfer USDC from buyer to contract
        usdc.transferFrom(msg.sender, address(this), price);

        // flag lets _update() allow this specific transfer without reverting due to the "no transfers after listing" rule
        _resaleInProgress = true;
        _transfer(seller, msg.sender, tokenId);
        _resaleInProgress = false;

        // distribute funds: royalty to receiver, rest to seller
        if (royaltyAmount > 0) {
            usdc.transfer(royaltyReceiver, royaltyAmount);
        }

        usdc.transfer(seller, price - royaltyAmount);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TRANSFER HOOK  (OZ v5 — replaces _beforeTokenTransfer)
    // ─────────────────────────────────────────────────────────────────────────
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);

        // from == address(0) means minting, to == address(0) means burning - both are allowed
        if (from != address(0) && to != address(0)) {
            // if this is a regular transfer (not part of a resale), enforce that the ticket is not listed for resale
            if (!_resaleInProgress) {
                revert EventTicket__ResaleNotAllowed();
            }
        }

        return super._update(to, tokenId, auth);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ON-CHAIN METADATA  (fully base64-encoded, no IPFS needed)
    // ─────────────────────────────────────────────────────────────────────────
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId); // OZ v5: reverts if tokenId not minted

        Ticket memory ticket = tickets[tokenId];
        Event memory evnt = events[ticket.eventId];

        string memory statusText;
        string memory statusColour;

        if (evnt.status == EventStatus.CANCELLED) {
            statusText = "CANCELLED";
            statusColour = "#ff4444";
        } else if (ticket.used) {
            statusText = "USED";
            statusColour = "#888888";
        } else {
            statusText = "VALID";
            statusColour = "#44cc88";
        }

        string memory svg = string(
            abi.encodePacked(
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 160">',
                '<rect width="320" height="160" fill="#0d0d1a" rx="12"/>',
                '<text x="160" y="45" fill="#f0c040" font-size="17" font-weight="bold" text-anchor="middle" font-family="monospace">',
                evnt.name,
                "</text>",
                '<text x="160" y="75" fill="#cccccc" font-size="12" text-anchor="middle" font-family="monospace">',
                evnt.venue,
                "</text>",
                '<text x="160" y="105" fill="#888888" font-size="11" text-anchor="middle" font-family="monospace">Seat #',
                ticket.seatNumber.toString(),
                "</text>",
                '<text x="160" y="140" fill="',
                statusColour,
                '" font-size="14" font-weight="bold" text-anchor="middle" font-family="monospace">',
                statusText,
                "</text>",
                "</svg>"
            )
        );

        string memory image = bytes(evnt.imageURI).length > 0
            ? evnt.imageURI
            : string(abi.encodePacked("data:image/svg+xml;base64,", Base64.encode(bytes(svg))));

        string memory json = string(
            abi.encodePacked(
                '{"name":"',
                evnt.name,
                " - Ticket #",
                tokenId.toString(),
                '",',
                '"description":"Official NFT ticket for ',
                evnt.name,
                " at ",
                evnt.venue,
                '",',
                '"image":"',
                image,
                '",',
                '"attributes":[',
                '{"trait_type":"Event","value":"',
                evnt.name,
                '"},',
                '{"trait_type":"Venue","value":"',
                evnt.venue,
                '"},',
                '{"trait_type":"Seat","value":',
                ticket.seatNumber.toString(),
                "},",
                '{"trait_type":"Status","value":"',
                statusText,
                '"}',
                "]}"
            )
        );

        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json))));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ERC-2981 — per-event royalty lookup
    // ─────────────────────────────────────────────────────────────────────────
    function royaltyInfo(uint256 tokenId, uint256 salePrice) public view override returns (address, uint256) {
        Ticket memory ticket = tickets[tokenId];
        Event memory evnt = events[ticket.eventId];
        address receiver = evnt.royaltyReceiver;
        uint256 royaltyAmount = (salePrice * evnt.royaltyFeeBps) / 10_000;
        return (receiver, royaltyAmount);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // view functions
    // ─────────────────────────────────────────────────────────────────────────
    function isValidator(uint256 eventId, address account) external view returns (bool) {
        if (eventId >= nextEventId) revert EventTicket__EventDoesNotExist(eventId);
        return _validators[eventId][account];
    }

    // ─────────────────────────────────────────────────────────────────────────
    // INTERFACE RESOLUTION  (diamond inheritance)
    // ─────────────────────────────────────────────────────────────────────────
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, ERC2981) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
