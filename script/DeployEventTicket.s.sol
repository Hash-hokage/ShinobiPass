//SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {Script} from "forge-std/Script.sol";
import {EventTicket} from "../src/EventTicket.sol";
import {console} from "forge-std/console.sol";

contract DeployEventTicket is Script {
    function run() external {
        vm.startBroadcast(msg.sender);
        EventTicket eventTicket = new EventTicket(msg.sender, 0x3600000000000000000000000000000000000000, 172800);
        vm.stopBroadcast();
        console.log("EventTicket deployed at:", address(eventTicket));
    }
}
