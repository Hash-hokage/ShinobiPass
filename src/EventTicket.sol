//SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC2981} from "@openzeppelin/contracts/token/common/ERC2981.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

contract EventTicket is ERC721, ERC2981, Ownable {
    using Strings for uint256;

    // ── Custom errors ─────────────────────────────────────────────────────────
    error EventDoesNotExist(uint256 eventId);
    error EventSoldOut(uint256 eventId);
    error InsufficientPayment(uint256 sent, uint256 required);
    error TicketAlreadyUsed(uint256 tokenId);
    error ResaleNotAllowed();
    error ResalePriceExceedsCap(uint256 price, uint256 cap);
    error NotTicketOwner(uint256 tokenId);
    error NotListed(uint256 tokenId);

    // ── Data structures ───────────────────────────────────────────────────────
    struct Event {
        string name;
        string venue;
        uint256 date;
        uint256 price;
        uint256 maxSupply; // Total tickets
        uint256 minted; // Tickets minted so far
        bool resaleAllowed;
        address royaltyReciever;
        uint256 resalePriceCap; // Max resale price
        uint96 royaltyFeeBps; // 500 = 5 %
    }

    struct Ticket {
        uint256 eventId;
        uint256 seatNumber;
        bool used;
        uint256 resalePrice;
    }

    // ── State ─────────────────────────────────────────────────────────────────
    uint256 public nextEventId;
    uint256 private _nextTokenId;

    mapping(uint256 => Event) public events; // eventId => Event
    mapping(uint256 => Ticket) public tickets; // tokenId => Ticket

    // Lets buyResaleTicket() bypass the transfer hook without a full reentrancy risk
    bool private _resaleInProgress;

    // ── Constructor ───────────────────────────────────────────────────────────
    constructor(address initialOwner) ERC721("EventTicket", "ETK") Ownable(initialOwner) {}

    // ─────────────────────────────────────────────────────────────────────────
    // ORGANIZER (admin) Functions
    // ─────────────────────────────────────────────────────────────────────────

    function createEvent(
        string calldata name,
        string calldata venue,
        uint256 date,
        uint256 price,
        uint256 maxSupply,
        uint256 minted,
        bool resaleAllowed,
        uint256 resalePriceCap,
        address royaltyReceiver,
        uint96 royaltyFeeBps
    ) external onlyOwner returns (uint256 eventId) {}
}
