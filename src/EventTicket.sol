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
        uint256 maxSupply; // Total t@ickets
        uint256 minted; // Tickets minted so far
        bool resaleAllowed;
        address royaltyReceiver;
        uint256 resalePriceCap; // Max resale price
        uint96 royaltyFeeBps; // 500 = 5 %
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
    address public constant USDC_ADDRESS = 0x3600000000000000000000000000000000000000; // Arc network USDC address

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
        // check msg.sender == events[eventId].organizer
        if (msg.sender != events[eventId].organizer) {
            revert EventTicket__NotEventOrganizer(eventId);
        }
        _;
    }

    modifier canScan(uint256 eventId) {
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
        uint96 royaltyFeeBps
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
            royaltyFeeBps: royaltyFeeBps
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
        if (events[eventId].status != EventStatus.UPCOMING) {
            revert EventTicket__InvalidEventStatus(eventId);
        }
        events[eventId].status = EventStatus.CANCELLED;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // BUYER Functions
    // ─────────────────────────────────────────────────────────────────────────
    function mintTicket(uint256 eventId) external {
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
    // INTERFACE RESOLUTION  (diamond inheritance)
    // ─────────────────────────────────────────────────────────────────────────
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, ERC2981) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
