// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {EventTicket} from "../src/EventTicket.sol";
import {ERC20Mock} from "@openzeppelin/contracts/mocks/token/ERC20Mock.sol";

// Reentrancy Mock
contract MaliciousERC20 is ERC20Mock {
    EventTicket public ticket;
    uint256 public targetEventId;
    bool public isAttacking;

    function setTicketAndEvent(EventTicket _ticket, uint256 _eventId) public {
        ticket = _ticket;
        targetEventId = _eventId;
    }

    function transfer(address to, uint256 value) public virtual override returns (bool) {
        if (isAttacking) {
            isAttacking = false; // Prevent infinite loop, only re-enter once
            ticket.claimFunds(targetEventId);
        }
        return super.transfer(to, value);
    }

    function startAttack() public {
        isAttacking = true;
    }

    function doAttack(EventTicket _ticket, uint256 _eventId) public {
        isAttacking = true;
        _ticket.claimFunds(_eventId);
    }
}

contract EventTicketTest is Test {
    EventTicket public ticket;
    ERC20Mock public usdc;

    address owner = makeAddr("owner");
    address organizer = makeAddr("organizer");
    address buyer1 = makeAddr("buyer1");
    address buyer2 = makeAddr("buyer2");
    address buyer3 = makeAddr("buyer3");
    address attacker = makeAddr("attacker");
    address validator = makeAddr("validator");
    address royaltyReceiver = makeAddr("royaltyReceiver");

    uint256 constant DEFAULT_PRICE = 10e6;
    uint256 constant DEFAULT_MAX_SUPPLY = 100;
    uint256 constant DEFAULT_RESALE_CAP = 20e6;
    uint96 constant DEFAULT_ROYALTY_BPS = 500;
    uint256 constant RELEASE_DELAY = 5 minutes;

    function setUp() public {
        usdc = new ERC20Mock();
        ticket = new EventTicket(owner, address(usdc), RELEASE_DELAY);

        address[8] memory actors = [owner, organizer, buyer1, buyer2, buyer3, attacker, validator, royaltyReceiver];
        for (uint256 i = 0; i < actors.length; i++) {
            usdc.mint(actors[i], 1000e6);
        }

        vm.warp(100 days);

        _createDefaultEvent(organizer);
    }

    function _createDefaultEvent(address _organizer) internal returns (uint256 eventId) {
        vm.prank(_organizer);
        eventId = ticket.createEvent(
            "Default Event",
            "Default Venue",
            block.timestamp + 30 days,
            DEFAULT_PRICE,
            DEFAULT_MAX_SUPPLY,
            true,
            DEFAULT_RESALE_CAP,
            royaltyReceiver, // We use the pre-defined actor
            DEFAULT_ROYALTY_BPS,
            ""
        );
    }

    function _mintTicket(address buyer, uint256 eventId) internal {
        vm.startPrank(buyer);
        usdc.approve(address(ticket), DEFAULT_PRICE);
        ticket.mintTicket(eventId);
        vm.stopPrank();
    }

    // --- Section 1: createEvent ---

    function test_createEvent_successfulCreation() public {
        uint256 eventId = ticket.nextEventId();

        vm.prank(organizer);
        uint256 newEventId =
            ticket.createEvent("New", "Venue", block.timestamp + 1 days, 50e6, 200, false, 0, royaltyReceiver, 0, "");

        assertEq(newEventId, eventId, "Event ID mismatch");
        assertEq(ticket.nextEventId(), eventId + 1, "nextEventId did not increment");

        (
            string memory name,
            string memory venue,
            address eventOrganizer,
            uint256 escrowBal,
            uint256 date,
            uint256 price,
            EventTicket.EventStatus status,
            uint256 maxSupply,
            uint256 minted,
            bool resaleAllowed,
            address eventRoyaltyReceiver,
            uint256 resaleCap,
            uint96 royaltyBps,
            string memory uri
        ) = ticket.events(newEventId);

        assertEq(name, "New");
        assertEq(venue, "Venue");
        assertEq(eventOrganizer, organizer);
        assertEq(escrowBal, 0);
        assertEq(date, block.timestamp + 1 days);
        assertEq(price, 50e6);
        assertEq(uint256(status), uint256(EventTicket.EventStatus.UPCOMING));
        assertEq(maxSupply, 200);
        assertEq(minted, 0);
        assertFalse(resaleAllowed);
        assertEq(eventRoyaltyReceiver, royaltyReceiver);
        assertEq(resaleCap, 0);
        assertEq(royaltyBps, 0);
        assertEq(uri, "");
    }

    function test_createEvent_differentOrganizersIsolation() public {
        uint256 id1 = _createDefaultEvent(buyer1);
        uint256 id2 = _createDefaultEvent(buyer2);

        (,, address org1,,,,,,,,,,,) = ticket.events(id1);
        (,, address org2,,,,,,,,,,,) = ticket.events(id2);

        assertEq(org1, buyer1);
        assertEq(org2, buyer2);
        assertTrue(id1 != id2);
    }

    function test_Revert_createEvent_priceZero() public {
        vm.prank(organizer);
        vm.expectRevert(EventTicket.EventTicket__TicketPriceMustBeGreaterThanZero.selector);
        ticket.createEvent("Name", "Venue", block.timestamp + 1 days, 0, 100, true, 20e6, royaltyReceiver, 500, "");
    }

    function test_Revert_createEvent_maxSupplyZero() public {
        vm.prank(organizer);
        vm.expectRevert(EventTicket.EventTicket__MaxSupplyMustBeGreaterThanZero.selector);
        ticket.createEvent("Name", "Venue", block.timestamp + 1 days, 10e6, 0, true, 20e6, royaltyReceiver, 500, "");
    }

    function test_Revert_createEvent_pastDate() public {
        vm.prank(organizer);
        vm.expectRevert(EventTicket.EventTicket__EventDateMustBeInTheFuture.selector);
        ticket.createEvent("Name", "Venue", block.timestamp - 1, 10e6, 100, true, 20e6, royaltyReceiver, 500, "");
    }

    function test_Revert_createEvent_currentDate() public {
        vm.prank(organizer);
        vm.expectRevert(EventTicket.EventTicket__EventDateMustBeInTheFuture.selector);
        ticket.createEvent("Name", "Venue", block.timestamp, 10e6, 100, true, 20e6, royaltyReceiver, 500, "");
    }

    // --- Section 2: mintTicket ---

    function test_mintTicket_successfulMint() public {
        uint256 contractBalBefore = usdc.balanceOf(address(ticket));
        uint256 buyerBalBefore = usdc.balanceOf(buyer1);
        (,,, uint256 escrowBefore,,,,,,,,,,) = ticket.events(0);

        _mintTicket(buyer1, 0);

        assertEq(ticket.ownerOf(0), buyer1, "Buyer does not own ticket");

        uint256 contractBalAfter = usdc.balanceOf(address(ticket));
        uint256 buyerBalAfter = usdc.balanceOf(buyer1);
        assertEq(contractBalAfter, contractBalBefore + DEFAULT_PRICE, "Contract USDC balance incorrect");
        assertEq(buyerBalAfter, buyerBalBefore - DEFAULT_PRICE, "Buyer USDC balance incorrect");

        (,,, uint256 escrowAfter,,,,, uint256 minted,,,,,) = ticket.events(0);
        assertEq(escrowAfter, escrowBefore + DEFAULT_PRICE, "Escrow balance not updated");
        assertEq(minted, 1, "Minted count incorrect");

        (uint256 eId, uint256 seatNumber, bool used, uint256 resalePrice, bool refundClaimed) = ticket.tickets(0);
        assertEq(eId, 0);
        assertEq(seatNumber, 1);
        assertFalse(used);
        assertEq(resalePrice, 0);
        assertFalse(refundClaimed);

        // Seat increment test
        _mintTicket(buyer2, 0);
        (, uint256 seatNumber2,,,) = ticket.tickets(1);
        assertEq(seatNumber2, 2);
    }

    function test_Revert_mintTicket_nonExistentEvent() public {
        vm.startPrank(buyer1);
        usdc.approve(address(ticket), DEFAULT_PRICE);
        vm.expectRevert(abi.encodeWithSelector(EventTicket.EventTicket__EventDoesNotExist.selector, 999));
        ticket.mintTicket(999);
        vm.stopPrank();
    }

    function test_Revert_mintTicket_cancelledEvent() public {
        vm.prank(organizer);
        ticket.cancelEvent(0);

        vm.startPrank(buyer1);
        usdc.approve(address(ticket), DEFAULT_PRICE);
        vm.expectRevert(abi.encodeWithSelector(EventTicket.EventTicket__InvalidEventStatus.selector, 0));
        ticket.mintTicket(0);
        vm.stopPrank();
    }

    function test_Revert_mintTicket_completedEvent() public {
        (,,,, uint256 date,,,,,,,,,) = ticket.events(0);
        vm.warp(date + RELEASE_DELAY);
        vm.prank(organizer);
        ticket.claimFunds(0);

        // Even though completed, minting should revert. We must rewind because claimFunds is called after date.
        // Wait, warp advances time globally.
        vm.startPrank(buyer1);
        usdc.approve(address(ticket), DEFAULT_PRICE);
        vm.expectRevert(abi.encodeWithSelector(EventTicket.EventTicket__InvalidEventStatus.selector, 0));
        ticket.mintTicket(0);
        vm.stopPrank();
    }

    function test_Revert_mintTicket_insufficientBalance() public {
        address brokeUser = makeAddr("brokeUser");
        vm.startPrank(brokeUser);
        usdc.approve(address(ticket), DEFAULT_PRICE);
        vm.expectRevert(abi.encodeWithSelector(EventTicket.EventTicket__InsufficientPayment.selector, 0, DEFAULT_PRICE));
        ticket.mintTicket(0);
        vm.stopPrank();
    }

    function test_Revert_mintTicket_insufficientAllowance() public {
        vm.startPrank(buyer1);
        // NO APPROVE
        vm.expectRevert(EventTicket.EventTicket__InsufficientAllowance.selector);
        ticket.mintTicket(0);
        vm.stopPrank();
    }

    function test_Revert_mintTicket_soldOut() public {
        vm.prank(organizer);
        uint256 eventId = ticket.createEvent(
            "Tiny", "TinyVenue", block.timestamp + 30 days, DEFAULT_PRICE, 1, true, 0, royaltyReceiver, 0, ""
        );

        _mintTicket(buyer1, eventId);

        vm.startPrank(buyer2);
        usdc.approve(address(ticket), DEFAULT_PRICE);
        vm.expectRevert(abi.encodeWithSelector(EventTicket.EventTicket__EventSoldOut.selector, eventId));
        ticket.mintTicket(eventId);
        vm.stopPrank();
    }

    // --- Section 3: claimFunds ---

    function test_claimFunds_successfulClaim() public {
        _mintTicket(buyer1, 0);

        (,,,, uint256 date,,,,,,,,,) = ticket.events(0);
        vm.warp(date + RELEASE_DELAY);

        uint256 organizerBalBefore = usdc.balanceOf(organizer);
        (,,, uint256 escrowBefore,,,,,,,,,,) = ticket.events(0);

        vm.prank(organizer);
        ticket.claimFunds(0);

        uint256 organizerBalAfter = usdc.balanceOf(organizer);
        assertEq(organizerBalAfter, organizerBalBefore + escrowBefore, "Organizer did not receive correct funds");

        (,,, uint256 escrowAfter,,, EventTicket.EventStatus status,,,,,,,) = ticket.events(0);
        assertEq(escrowAfter, 0, "Escrow not zeroed");
        assertEq(uint256(status), uint256(EventTicket.EventStatus.COMPLETED), "Status not COMPLETED");
    }

    function test_Revert_claimFunds_beforeReleaseWindow() public {
        (,,,, uint256 date,,,,,,,,,) = ticket.events(0);
        vm.warp(date + RELEASE_DELAY - 1);

        vm.prank(organizer);
        vm.expectRevert(EventTicket.EventTicket__FundsNotYetReleasable.selector);
        ticket.claimFunds(0);
    }

    function test_Revert_claimFunds_cancelledEvent() public {
        vm.prank(organizer);
        ticket.cancelEvent(0);

        (,,,, uint256 date,,,,,,,,,) = ticket.events(0);
        vm.warp(date + RELEASE_DELAY);

        vm.prank(organizer);
        vm.expectRevert(abi.encodeWithSelector(EventTicket.EventTicket__InvalidEventStatus.selector, 0));
        ticket.claimFunds(0);
    }

    function test_Revert_claimFunds_alreadyCompleted() public {
        (,,,, uint256 date,,,,,,,,,) = ticket.events(0);
        vm.warp(date + RELEASE_DELAY);

        vm.startPrank(organizer);
        ticket.claimFunds(0);

        vm.expectRevert(abi.encodeWithSelector(EventTicket.EventTicket__InvalidEventStatus.selector, 0));
        ticket.claimFunds(0);
        vm.stopPrank();
    }

    function test_Revert_claimFunds_nonOrganizer() public {
        (,,,, uint256 date,,,,,,,,,) = ticket.events(0);
        vm.warp(date + RELEASE_DELAY);

        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(EventTicket.EventTicket__NotEventOrganizer.selector, 0));
        ticket.claimFunds(0);
    }

    // --- Section 4: cancelEvent ---

    function test_cancelEvent_successfullyCancelled() public {
        vm.prank(organizer);
        ticket.cancelEvent(0);

        (,,,,,, EventTicket.EventStatus status,,,,,,,) = ticket.events(0);
        assertEq(uint256(status), uint256(EventTicket.EventStatus.CANCELLED));
    }

    function test_Revert_cancelEvent_afterEventDate() public {
        (,,,, uint256 date,,,,,,,,,) = ticket.events(0);
        vm.warp(date);

        vm.prank(organizer);
        vm.expectRevert(abi.encodeWithSelector(EventTicket.EventTicket__EventAlreadyOccurred.selector, 0));
        ticket.cancelEvent(0);
    }

    function test_Revert_cancelEvent_alreadyCancelled() public {
        vm.startPrank(organizer);
        ticket.cancelEvent(0);

        vm.expectRevert(abi.encodeWithSelector(EventTicket.EventTicket__InvalidEventStatus.selector, 0));
        ticket.cancelEvent(0);
        vm.stopPrank();
    }

    function test_Revert_cancelEvent_completedEvent() public {
        (,,,, uint256 date,,,,,,,,,) = ticket.events(0);
        vm.warp(date + RELEASE_DELAY);

        vm.prank(organizer);
        ticket.claimFunds(0);

        vm.prank(organizer);
        vm.expectRevert(abi.encodeWithSelector(EventTicket.EventTicket__EventAlreadyOccurred.selector, 0));
        ticket.cancelEvent(0);
    }

    function test_Revert_cancelEvent_nonOrganizer() public {
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(EventTicket.EventTicket__NotEventOrganizer.selector, 0));
        ticket.cancelEvent(0);
    }

    // --- Section 5: claimRefund ---

    function test_claimRefund_fullFlow() public {
        _mintTicket(buyer1, 0); // token 0

        (,,, uint256 escrowBefore,,,,,,,,,,) = ticket.events(0);

        vm.prank(organizer);
        ticket.cancelEvent(0);

        uint256 buyerBalBefore = usdc.balanceOf(buyer1);

        vm.prank(buyer1);
        ticket.claimRefund(0);

        uint256 buyerBalAfter = usdc.balanceOf(buyer1);
        assertEq(buyerBalAfter, buyerBalBefore + DEFAULT_PRICE, "Buyer not refunded correctly");

        (,,, uint256 escrowAfter,,,,,,,,,,) = ticket.events(0);
        assertEq(escrowAfter, escrowBefore - DEFAULT_PRICE, "Escrow not decremented correctly");

        // Verify NFT burned
        vm.expectRevert(abi.encodeWithSignature("ERC721NonexistentToken(uint256)", 0));
        ticket.ownerOf(0);
    }

    function test_Revert_claimRefund_twice() public {
        _mintTicket(buyer1, 0);

        vm.prank(organizer);
        ticket.cancelEvent(0);

        vm.startPrank(buyer1);
        ticket.claimRefund(0);

        vm.expectRevert(EventTicket.EventTicket__FundsAlreadyClaimed.selector);
        ticket.claimRefund(0);
        vm.stopPrank();
    }

    function test_Revert_claimRefund_nonCancelledEvent() public {
        _mintTicket(buyer1, 0);

        vm.prank(buyer1);
        vm.expectRevert(abi.encodeWithSelector(EventTicket.EventTicket__InvalidEventStatus.selector, 0));
        ticket.claimRefund(0);
    }

    function test_Revert_claimRefund_notOwner() public {
        _mintTicket(buyer1, 0);

        vm.prank(organizer);
        ticket.cancelEvent(0);

        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(EventTicket.EventTicket__NotTicketOwner.selector, 0));
        ticket.claimRefund(0);
    }

    // --- Section 6 & 7: validator system & useTicket ---

    function test_validator_and_useTicket_flow() public {
        _mintTicket(buyer1, 0);

        assertFalse(ticket.isValidator(0, validator));

        vm.prank(organizer);
        ticket.addValidator(0, validator);

        assertTrue(ticket.isValidator(0, validator));

        vm.prank(validator);
        ticket.useTicket(0);

        (,, bool used,,) = ticket.tickets(0);
        assertTrue(used, "Ticket not marked as used");

        string memory uri = ticket.tokenURI(0);
        assertFalse(bytes(uri).length == 0);
        // It shouldn't revert. We could check strings but foundry string contains check exists via strings library or indexOf.
        // For simplicity, just asserting it works.

        vm.prank(organizer);
        ticket.removeValidator(0, validator);
        assertFalse(ticket.isValidator(0, validator));

        vm.prank(validator);
        vm.expectRevert(abi.encodeWithSelector(EventTicket.EventTicket__NotAuthorizedToScan.selector, 0));
        ticket.useTicket(0); // Should revert since validator removed, although ticket is used anyway (but modifier reverts first).
    }

    function test_Revert_useTicket_notValidator() public {
        _mintTicket(buyer1, 0);
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(EventTicket.EventTicket__NotAuthorizedToScan.selector, 0));
        ticket.useTicket(0);
    }

    function test_Revert_useTicket_ticketAlreadyUsed() public {
        _mintTicket(buyer1, 0);
        vm.startPrank(organizer); // organizer is technically always a validator
        ticket.useTicket(0);

        vm.expectRevert(abi.encodeWithSelector(EventTicket.EventTicket__TicketAlreadyUsed.selector, 0));
        ticket.useTicket(0);
        vm.stopPrank();
    }

    function test_Revert_addValidator_notOrganizer() public {
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(EventTicket.EventTicket__NotEventOrganizer.selector, 0));
        ticket.addValidator(0, attacker);
    }

    // --- Section 8: resale market ---

    function test_resaleMarket_fullFlow() public {
        _mintTicket(buyer1, 0); // token 0

        vm.startPrank(buyer1);
        ticket.listForResale(0, 15e6);
        vm.stopPrank();

        uint256 royaltyBalBefore = usdc.balanceOf(royaltyReceiver);
        uint256 buyer1BalBefore = usdc.balanceOf(buyer1);
        uint256 buyer2BalBefore = usdc.balanceOf(buyer2);

        vm.startPrank(buyer2);
        usdc.approve(address(ticket), 15e6);
        ticket.buyResaleTicket(0);
        vm.stopPrank();

        assertEq(ticket.ownerOf(0), buyer2, "Ownership not transferred");

        uint256 royaltyAmount = (15e6 * DEFAULT_ROYALTY_BPS) / 10_000;
        uint256 sellerAmount = 15e6 - royaltyAmount;

        assertEq(usdc.balanceOf(royaltyReceiver), royaltyBalBefore + royaltyAmount, "Royalty not distributed");
        assertEq(usdc.balanceOf(buyer1), buyer1BalBefore + sellerAmount, "Seller not paid correctly");
        assertEq(usdc.balanceOf(buyer2), buyer2BalBefore - 15e6, "Buyer total paid is incorrect");

        // Verify state is clean
        (,,, uint256 rPrice,) = ticket.tickets(0);
        assertEq(rPrice, 0, "Resale price not reset");
    }

    function test_Revert_listForResale_priceZero() public {
        _mintTicket(buyer1, 0);

        vm.prank(buyer1);
        vm.expectRevert(EventTicket.EventTicket__TicketPriceMustBeGreaterThanZero.selector);
        ticket.listForResale(0, 0);
    }

    function test_Revert_listForResale_exceedsCap() public {
        _mintTicket(buyer1, 0);

        vm.prank(buyer1);
        vm.expectRevert(
            abi.encodeWithSelector(EventTicket.EventTicket__ResalePriceExceedsCap.selector, 21e6, DEFAULT_RESALE_CAP)
        );
        ticket.listForResale(0, 21e6);
    }

    function test_Revert_listForResale_usedTicket() public {
        _mintTicket(buyer1, 0);

        vm.prank(organizer);
        ticket.useTicket(0);

        vm.prank(buyer1);
        vm.expectRevert(abi.encodeWithSelector(EventTicket.EventTicket__TicketAlreadyUsed.selector, 0));
        ticket.listForResale(0, 15e6);
    }

    function test_Revert_listForResale_notOwned() public {
        _mintTicket(buyer1, 0);

        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(EventTicket.EventTicket__NotTicketOwner.selector, 0));
        ticket.listForResale(0, 15e6);
    }

    function test_Revert_listForResale_cancelledEvent() public {
        _mintTicket(buyer1, 0);

        vm.prank(organizer);
        ticket.cancelEvent(0);

        vm.prank(buyer1);
        vm.expectRevert(abi.encodeWithSelector(EventTicket.EventTicket__InvalidEventStatus.selector, 0));
        ticket.listForResale(0, 15e6);
    }

    function test_Revert_buyResaleTicket_notListed() public {
        _mintTicket(buyer1, 0);

        vm.startPrank(buyer2);
        usdc.approve(address(ticket), 15e6);
        vm.expectRevert(abi.encodeWithSelector(EventTicket.EventTicket__NotListed.selector, 0));
        ticket.buyResaleTicket(0);
        vm.stopPrank();
    }

    function test_Revert_buyResaleTicket_cancelledEvent() public {
        _mintTicket(buyer1, 0);

        vm.prank(buyer1);
        ticket.listForResale(0, 15e6);

        vm.prank(organizer);
        ticket.cancelEvent(0);

        vm.startPrank(buyer2);
        usdc.approve(address(ticket), 15e6);
        vm.expectRevert(abi.encodeWithSelector(EventTicket.EventTicket__InvalidEventStatus.selector, 0));
        ticket.buyResaleTicket(0);
        vm.stopPrank();
    }

    // --- Section 9: transfer hook ---

    function test_Revert_transferFrom_directly() public {
        _mintTicket(buyer1, 0);

        vm.prank(buyer1);
        vm.expectRevert(EventTicket.EventTicket__ResaleNotAllowed.selector);
        ticket.transferFrom(buyer1, buyer2, 0);
    }

    function test_Revert_safeTransferFrom_directly() public {
        _mintTicket(buyer1, 0);

        vm.prank(buyer1);
        vm.expectRevert(EventTicket.EventTicket__ResaleNotAllowed.selector);
        ticket.safeTransferFrom(buyer1, buyer2, 0);
    }

    function test_Revert_transferFrom_withApproval() public {
        _mintTicket(buyer1, 0);

        vm.prank(buyer1);
        ticket.approve(attacker, 0);

        vm.prank(attacker);
        vm.expectRevert(EventTicket.EventTicket__ResaleNotAllowed.selector);
        ticket.transferFrom(buyer1, buyer2, 0);
    }

    // Minting bypassing hook is implicitly tested in all _mintTicket calls over Section 2
    // BuyResaleTicket bypassing hook is implicitly tested in Section 8 test_resaleMarket_fullFlow
    // Burn bypassing hook is implicitly tested in Section 5 test_claimRefund_fullFlow

    // --- Section 10: attacker scenarios ---

    // Attacker tries to claim funds from an event they did not create
    function test_Attacker_claimFunds_reverts() public {
        (,,,, uint256 date,,,,,,,,,) = ticket.events(0);
        vm.warp(date + RELEASE_DELAY);

        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(EventTicket.EventTicket__NotEventOrganizer.selector, 0));
        ticket.claimFunds(0);
    }

    // Attacker tries to cancel an event they did not create
    function test_Attacker_cancelEvent_reverts() public {
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(EventTicket.EventTicket__NotEventOrganizer.selector, 0));
        ticket.cancelEvent(0);
    }

    // Attacker tries to add themselves as a validator on someone else's event
    function test_Attacker_addValidator_reverts() public {
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(EventTicket.EventTicket__NotEventOrganizer.selector, 0));
        ticket.addValidator(0, attacker);
    }

    // Attacker tries to use useTicket without being a validator
    function test_Attacker_useTicket_reverts() public {
        _mintTicket(buyer1, 0);
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(EventTicket.EventTicket__NotAuthorizedToScan.selector, 0));
        ticket.useTicket(0);
    }

    // Attacker tries to call claimRefund on a ticket they don't own
    function test_Attacker_claimRefund_reverts() public {
        _mintTicket(buyer1, 0);
        vm.prank(organizer);
        ticket.cancelEvent(0);

        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(EventTicket.EventTicket__NotTicketOwner.selector, 0));
        ticket.claimRefund(0);
    }

    // Attacker tries to mint a ticket then immediately transfer it directly to another wallet bypassing buyResaleTicket
    function test_Attacker_transferFrom_bypassingResale_reverts() public {
        _mintTicket(attacker, 0);
        vm.prank(attacker);
        vm.expectRevert(EventTicket.EventTicket__ResaleNotAllowed.selector);
        ticket.transferFrom(attacker, makeAddr("accomplice"), 0);
    }

    // Attacker creates an event, sells tickets, then tries to call cancelEvent after the event date
    function test_Attacker_cancelAfterEventDate_reverts() public {
        uint256 eId = _createDefaultEvent(attacker);
        _mintTicket(buyer1, eId);

        (,,,, uint256 date,,,,,,,,,) = ticket.events(eId);
        vm.warp(date); // Exact start time

        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(EventTicket.EventTicket__EventAlreadyOccurred.selector, eId));
        ticket.cancelEvent(eId);
    }

    // Attacker tries to call claimFunds twice on the same event
    function test_Attacker_claimFunds_twice_reverts() public {
        uint256 eId = _createDefaultEvent(attacker);
        (,,,, uint256 date,,,,,,,,,) = ticket.events(eId);
        vm.warp(date + RELEASE_DELAY);

        vm.startPrank(attacker);
        ticket.claimFunds(eId); // Should work
        vm.expectRevert(abi.encodeWithSelector(EventTicket.EventTicket__InvalidEventStatus.selector, eId));
        ticket.claimFunds(eId); // Reverts
        vm.stopPrank();
    }

    // Attacker tries to call claimRefund twice on the same token
    // (Already tested in Section 5)

    // Attacker tries to mint on event ID type(uint256).max
    function test_Attacker_mintMaxId_reverts() public {
        vm.startPrank(attacker);
        usdc.approve(address(ticket), type(uint256).max);
        vm.expectRevert(abi.encodeWithSelector(EventTicket.EventTicket__EventDoesNotExist.selector, type(uint256).max));
        ticket.mintTicket(type(uint256).max);
        vm.stopPrank();
    }

    // Attacker with zero USDC tries to mint
    function test_Attacker_zeroUSDCMint_reverts() public {
        address brokeAttacker = makeAddr("brokeAttacker");
        vm.startPrank(brokeAttacker);
        usdc.approve(address(ticket), DEFAULT_PRICE);
        vm.expectRevert(abi.encodeWithSelector(EventTicket.EventTicket__InsufficientPayment.selector, 0, DEFAULT_PRICE));
        ticket.mintTicket(0);
        vm.stopPrank();
    }

    // Attacker tries to front-run a buyResaleTicket by transferring the NFT directly mid-transaction
    function test_Attacker_frontRunBuyResaleDirectTransfer_reverts() public {
        _mintTicket(attacker, 0);
        vm.prank(attacker);
        ticket.listForResale(0, 15e6);

        // Attacker attempts dropping ownership directly. The direct transfer hook prevents it anyway.
        vm.prank(attacker);
        vm.expectRevert(EventTicket.EventTicket__ResaleNotAllowed.selector);
        ticket.transferFrom(attacker, makeAddr("accomplice"), 0);
    }

    // Reentrancy attempt: attacker deploys a malicious ERC-20
    function test_Attacker_Reentrancy_claimFunds() public {
        MaliciousERC20 malUsdc = new MaliciousERC20();
        EventTicket malTicket = new EventTicket(owner, address(malUsdc), RELEASE_DELAY);

        malUsdc.mint(address(malUsdc), 1000e6);
        malUsdc.mint(buyer1, 1000e6);

        vm.prank(address(malUsdc));
        uint256 eId = malTicket.createEvent(
            "Malicious", "Hack Venue", block.timestamp + 30 days, DEFAULT_PRICE, 100, false, 0, royaltyReceiver, 0, ""
        );

        vm.startPrank(buyer1);
        malUsdc.approve(address(malTicket), DEFAULT_PRICE);
        malTicket.mintTicket(eId);
        vm.stopPrank();

        (,,,, uint256 date,,,,,,,,,) = malTicket.events(eId);
        vm.warp(date + RELEASE_DELAY);

        malUsdc.setTicketAndEvent(malTicket, eId);

        // The exact revert reason is InvalidEventStatus because when it re-enters, the status is already COMPLETED.
        vm.expectRevert(abi.encodeWithSelector(EventTicket.EventTicket__InvalidEventStatus.selector, eId));
        malUsdc.doAttack(malTicket, eId);
    }

    // --- Section 11: edge cases and boundary conditions ---

    function test_Edge_mintExactlyMaxSupply() public {
        uint256 eId =
            ticket.createEvent("Edge", "Venue", block.timestamp + 1 days, 1e6, 1, false, 0, royaltyReceiver, 0, "");

        vm.startPrank(buyer1);
        usdc.approve(address(ticket), 1e6);
        ticket.mintTicket(eId); // 1st ticket goes through
        vm.stopPrank();

        vm.startPrank(buyer2);
        usdc.approve(address(ticket), 1e6);
        vm.expectRevert(abi.encodeWithSelector(EventTicket.EventTicket__EventSoldOut.selector, eId));
        ticket.mintTicket(eId); // 2nd ticket reverts
        vm.stopPrank();
    }

    function test_Edge_royaltyFeeBps_zero() public {
        uint256 eId =
            ticket.createEvent("Edge", "Venue", block.timestamp + 1 days, 10e6, 10, true, 20e6, royaltyReceiver, 0, "");
        _mintTicket(buyer1, eId);

        vm.prank(buyer1);
        ticket.listForResale(0, 20e6); // eId resolves to tokenId 0 because _nextTokenId continues. Actually it is tokenId 0 since it is a new test state! Wait no, the setup created an event but the `test_` is isolated. So yes, it's 0.

        uint256 sellerBalBefore = usdc.balanceOf(buyer1);
        uint256 royaltyBalBefore = usdc.balanceOf(royaltyReceiver);

        vm.startPrank(buyer2);
        usdc.approve(address(ticket), 20e6);
        ticket.buyResaleTicket(0);
        vm.stopPrank();

        assertEq(usdc.balanceOf(buyer1), sellerBalBefore + 20e6); // 100% to seller
        assertEq(usdc.balanceOf(royaltyReceiver), royaltyBalBefore); // 0% to royaltyReceiver
    }

    function test_Edge_royaltyFeeBps_100Percent() public {
        uint256 eId = ticket.createEvent(
            "Edge", "Venue", block.timestamp + 1 days, 10e6, 10, true, 20e6, royaltyReceiver, 10000, ""
        );
        _mintTicket(buyer1, eId);

        vm.prank(buyer1);
        ticket.listForResale(0, 20e6);

        uint256 sellerBalBefore = usdc.balanceOf(buyer1);
        uint256 royaltyBalBefore = usdc.balanceOf(royaltyReceiver);

        vm.startPrank(buyer2);
        usdc.approve(address(ticket), 20e6);
        ticket.buyResaleTicket(0);
        vm.stopPrank();

        assertEq(usdc.balanceOf(buyer1), sellerBalBefore); // 0% to seller
        assertEq(usdc.balanceOf(royaltyReceiver), royaltyBalBefore + 20e6); // 100% to royaltyReceiver
    }

    function test_Edge_resalePriceCap_zero() public {
        uint256 eId =
            ticket.createEvent("Edge", "Venue", block.timestamp + 1 days, 10e6, 10, true, 0, royaltyReceiver, 500, "");
        _mintTicket(buyer1, eId);

        vm.prank(buyer1);
        ticket.listForResale(0, 1000e6); // Cap is 0, so any price should be allowed

        (,,, uint256 resalePrice,) = ticket.tickets(0);
        assertEq(resalePrice, 1000e6);
    }

    function test_Edge_zeroMintedCancelEvent() public {
        uint256 eId =
            ticket.createEvent("Edge", "Venue", block.timestamp + 1 days, 10e6, 10, true, 0, royaltyReceiver, 500, "");

        vm.prank(address(this)); // creator is address(this) for this event
        ticket.cancelEvent(eId);

        (,,, uint256 escrowBal,,,,,,,,,,) = ticket.events(eId);
        assertEq(escrowBal, 0); // No refunds exist
    }

    function test_Edge_releaseDelay_zero() public {
        EventTicket promptTicket = new EventTicket(owner, address(usdc), 0);
        vm.prank(organizer);
        uint256 eId = promptTicket.createEvent(
            "Edge", "Venue", block.timestamp + 1 days, 10e6, 10, true, 0, royaltyReceiver, 500, ""
        );

        vm.warp(block.timestamp + 1 days);
        vm.prank(organizer);
        promptTicket.claimFunds(eId); // Should instantly claim since delay is 0
        (,,,,,, EventTicket.EventStatus status,,,,,,,) = promptTicket.events(eId);
        assertEq(uint256(status), uint256(EventTicket.EventStatus.COMPLETED));
    }

    function test_Edge_boundaryExactReleaseDelay() public {
        (,,,, uint256 date,,,,,,,,,) = ticket.events(0);
        vm.warp(date + RELEASE_DELAY);
        vm.prank(organizer);
        ticket.claimFunds(0); // Succeeds exactly on the second
        (,,,,,, EventTicket.EventStatus status,,,,,,,) = ticket.events(0);
        assertEq(uint256(status), uint256(EventTicket.EventStatus.COMPLETED));
    }

    function test_Revert_Edge_boundaryReleaseDelayMinusOne() public {
        (,,,, uint256 date,,,,,,,,,) = ticket.events(0);
        vm.warp(date + RELEASE_DELAY - 1);
        vm.prank(organizer);
        vm.expectRevert(EventTicket.EventTicket__FundsNotYetReleasable.selector);
        ticket.claimFunds(0); // Fails 1 second before
    }

    // --- Section 12: fullLifecycle ---

    function test_fullLifecycle() public {
        // 1. Event Creation
        vm.prank(organizer);
        uint256 eId = ticket.createEvent(
            "Finale", "Main Stage", block.timestamp + 10 days, 20e6, 50, true, 40e6, royaltyReceiver, 500, ""
        );

        // 2. Minting
        vm.startPrank(buyer1);
        usdc.approve(address(ticket), 20e6);
        ticket.mintTicket(eId);
        vm.stopPrank();

        // buyer1 owns token 0 (if no other tests polluted state) Wait, `setUp` created id 0. So eId is 1. token is 0 because `setUp` doesn't mint. Token is 0.
        uint256 tId = 0; // The first mint in this run
        assertEq(ticket.ownerOf(tId), buyer1);

        // 3. Reshell Listing
        vm.prank(buyer1);
        ticket.listForResale(tId, 30e6);

        // 4. Resell Purchase
        vm.startPrank(buyer2);
        usdc.approve(address(ticket), 30e6);
        ticket.buyResaleTicket(tId);
        vm.stopPrank();

        assertEq(ticket.ownerOf(tId), buyer2);

        // 5. Validation setup
        vm.prank(organizer);
        ticket.addValidator(eId, validator);

        // 6. Usage (Scanning)
        vm.prank(validator);
        ticket.useTicket(tId);
        (,, bool used,,) = ticket.tickets(tId);
        assertTrue(used);

        // 7. Time progresses past event end
        (,,,, uint256 date,,,,,,,,,) = ticket.events(eId);
        vm.warp(date + RELEASE_DELAY);

        // 8. Fund Reclamation
        uint256 orgBalBefore = usdc.balanceOf(organizer);
        vm.prank(organizer);
        ticket.claimFunds(eId);

        // Organizer gets strictly the primary market mints volume. Resales don't go to escrow!
        assertEq(usdc.balanceOf(organizer), orgBalBefore + 20e6);
    }
}
