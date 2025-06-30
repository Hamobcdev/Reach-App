// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/UnbankedPayCard.sol";

contract DeployUnbankedPayCard is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy the contract
        UnbankedPayCard unbankedPayCard = new UnbankedPayCard();
        
        console.log("UnbankedPayCard deployed to:", address(unbankedPayCard));
        
        // Optional: Create a test card for verification
        uint256 testCardId = unbankedPayCard.createCard("USD", "global", 2);
        console.log("Test card created with ID:", testCardId);
        
        vm.stopBroadcast();
    }
}