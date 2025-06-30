// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "contracts/lib/forge-std/src/Script.sol";
import "contracts/src/AidStableCoin.sol";
import "contracts/src/AidBadgeNFT.sol";
import "contracts/src/AidManager.sol";
import "/home/bcdev/projects/reach/contracts/src/MockV3Aggregator.sol";

contract DeployAidSystem is Script {
    function run() external {
        vm.startBroadcast();

        // Deploy mock price feed for testnet
        bool useMock = vm.envBool("USE_MOCK_FEEDS");
        address priceFeed;
        if (useMock) {
            MockV3Aggregator mock = new MockV3Aggregator(245000000); // 2.45 USD/WST
            priceFeed = address(mock);
        } else {
            priceFeed = vm.envAddress("CHAINLINK_ETH_USD_FEED"); // Real feed for production
        }

        // Deploy contracts
        AidStableCoin stable = new AidStableCoin("Samoa Aid Token", "SAT");
        AidBadgeNFT badge = new AidBadgeNFT();
        AidManager manager = new AidManager(address(stable), address(badge), priceFeed, useMock);

        // Grant roles to manager
        stable.grantRole(stable.MINTER_ROLE(), address(manager));
        badge.grantRole(badge.ISSUER_ROLE(), address(manager));

        vm.stopBroadcast();
    }
}