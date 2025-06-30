// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script} from "contracts/lib/forge-std/src/Script.sol";

contract HelperConfig is Script {
    /*//////////////////////////////////////////////////////////////
                               ERRORS
    //////////////////////////////////////////////////////////////*/
    error HelperConfig__InvalidChainId();

    /*//////////////////////////////////////////////////////////////
                               TYPES
    //////////////////////////////////////////////////////////////*/
    struct NetworkConfig {
        uint256 deployerKey;
        address initialOwner;
        string[] initialCurrencies;
        address[] initialMerchants;
        uint256 minFundingAmount;
        uint256 maxFundingAmount;
        bool useAnvil;
    }

    /*//////////////////////////////////////////////////////////////
                           STATE VARIABLES
    //////////////////////////////////////////////////////////////*/
    uint256 public constant DEFAULT_ANVIL_PRIVATE_KEY = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
    uint256 public constant SEPOLIA_CHAIN_ID = 11155111;
    uint256 public constant MAINNET_CHAIN_ID = 1;
    uint256 public constant POLYGON_CHAIN_ID = 137;
    uint256 public constant POLYGON_MUMBAI_CHAIN_ID = 80001;
    uint256 public constant BSC_CHAIN_ID = 56;
    uint256 public constant BSC_TESTNET_CHAIN_ID = 97;
    uint256 public constant ANVIL_CHAIN_ID = 31337;

    NetworkConfig public localNetworkConfig;
    mapping(uint256 => NetworkConfig) public networkConfigs;

    /*//////////////////////////////////////////////////////////////
                               EVENTS
    //////////////////////////////////////////////////////////////*/
    event HelperConfig__CreatedMockAccounts(address[] accounts);

    /*//////////////////////////////////////////////////////////////
                              MODIFIERS
    //////////////////////////////////////////////////////////////*/
    modifier validChainId(uint256 chainId) {
        if (chainId == 0) {
            revert HelperConfig__InvalidChainId();
        }
        _;
    }

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/
    constructor() {
        networkConfigs[SEPOLIA_CHAIN_ID] = getSepoliaEthConfig();
        networkConfigs[MAINNET_CHAIN_ID] = getMainnetEthConfig();
        networkConfigs[POLYGON_CHAIN_ID] = getPolygonMainnetConfig();
        networkConfigs[POLYGON_MUMBAI_CHAIN_ID] = getPolygonMumbaiConfig();
        networkConfigs[BSC_CHAIN_ID] = getBscMainnetConfig();
        networkConfigs[BSC_TESTNET_CHAIN_ID] = getBscTestnetConfig();
    }

    /*//////////////////////////////////////////////////////////////
                           PUBLIC FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    function getConfig() public returns (NetworkConfig memory) {
        return getConfigByChainId(block.chainid);
    }

    function getConfigByChainId(uint256 chainId) public returns (NetworkConfig memory) {
        if (chainId == ANVIL_CHAIN_ID) {
            return getOrCreateAnvilEthConfig();
        } else if (networkConfigs[chainId].deployerKey != 0) {
            return networkConfigs[chainId];
        } else {
            revert HelperConfig__InvalidChainId();
        }
    }

    /*//////////////////////////////////////////////////////////////
                        NETWORK CONFIGURATIONS
    //////////////////////////////////////////////////////////////*/
    function getSepoliaEthConfig() public view returns (NetworkConfig memory) {
        string[] memory currencies = new string[](12);
        currencies[0] = "USD";
        currencies[1] = "EUR";
        currencies[2] = "NGN";
        currencies[3] = "KES";
        currencies[4] = "PHP";
        currencies[5] = "INR";
        currencies[6] = "ZAR";
        currencies[7] = "GHS";
        currencies[8] = "NZD"; // New Zealand Dollar
        currencies[9] = "AUD"; // Australian Dollar
        currencies[10] = "TOP"; // Tongan Pa'anga
        currencies[11] = "FJD"; // Fijian Dollar

        address[] memory merchants = new address[](3);
        merchants[0] = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8; // Test merchant 1
        merchants[1] = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC; // Test merchant 2
        merchants[2] = 0x90F79bf6EB2c4f870365E785982E1f101E93b906; // Test merchant 3

        return NetworkConfig({
            deployerKey: vm.envUint("PRIVATE_KEY"),
            initialOwner: vm.envAddress("INITIAL_OWNER"),
            initialCurrencies: currencies,
            initialMerchants: merchants,
            minFundingAmount: 0.01 ether,
            maxFundingAmount: 10 ether,
            useAnvil: false
        });
    }

    function getMainnetEthConfig() public view returns (NetworkConfig memory) {
        string[] memory currencies = new string[](12);
        currencies[0] = "USD";
        currencies[1] = "EUR";
        currencies[2] = "NGN";
        currencies[3] = "KES";
        currencies[4] = "PHP";
        currencies[5] = "INR";
        currencies[6] = "ZAR";
        currencies[7] = "GHS";
        currencies[8] = "NZD"; // New Zealand Dollar
        currencies[9] = "AUD"; // Australian Dollar
        currencies[10] = "TOP"; // Tongan Pa'anga
        currencies[11] = "FJD"; // Fijian Dollar

        address[] memory merchants = new address[](0); // Empty for mainnet - to be added post-deployment

        return NetworkConfig({
            deployerKey: vm.envUint("PRIVATE_KEY"),
            initialOwner: vm.envAddress("INITIAL_OWNER"),
            initialCurrencies: currencies,
            initialMerchants: merchants,
            minFundingAmount: 0.01 ether,
            maxFundingAmount: 100 ether,
            useAnvil: false
        });
    }

    function getPolygonMainnetConfig() public view returns (NetworkConfig memory) {
        string[] memory currencies = new string[](14);
        currencies[0] = "USD";
        currencies[1] = "EUR";
        currencies[2] = "NGN";
        currencies[3] = "KES";
        currencies[4] = "PHP";
        currencies[5] = "INR";
        currencies[6] = "ZAR";
        currencies[7] = "GHS";
        currencies[8] = "MATIC";
        currencies[9] = "USDC";
        currencies[10] = "NZD"; // New Zealand Dollar
        currencies[11] = "AUD"; // Australian Dollar
        currencies[12] = "TOP"; // Tongan Pa'anga
        currencies[13] = "FJD"; // Fijian Dollar

        address[] memory merchants = new address[](0);

        return NetworkConfig({
            deployerKey: vm.envUint("PRIVATE_KEY"),
            initialOwner: vm.envAddress("INITIAL_OWNER"),
            initialCurrencies: currencies,
            initialMerchants: merchants,
            minFundingAmount: 1 ether, // 1 MATIC
            maxFundingAmount: 10000 ether, // 10000 MATIC
            useAnvil: false
        });
    }

    function getPolygonMumbaiConfig() public view returns (NetworkConfig memory) {
        string[] memory currencies = new string[](14);
        currencies[0] = "USD";
        currencies[1] = "EUR";
        currencies[2] = "NGN";
        currencies[3] = "KES";
        currencies[4] = "PHP";
        currencies[5] = "INR";
        currencies[6] = "ZAR";
        currencies[7] = "GHS";
        currencies[8] = "MATIC";
        currencies[9] = "USDC";
        currencies[10] = "NZD"; // New Zealand Dollar
        currencies[11] = "AUD"; // Australian Dollar
        currencies[12] = "TOP"; // Tongan Pa'anga
        currencies[13] = "FJD"; // Fijian Dollar

        address[] memory merchants = new address[](2);
        merchants[0] = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
        merchants[1] = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC;

        return NetworkConfig({
            deployerKey: vm.envUint("PRIVATE_KEY"),
            initialOwner: vm.envAddress("INITIAL_OWNER"),
            initialCurrencies: currencies,
            initialMerchants: merchants,
            minFundingAmount: 0.1 ether,
            maxFundingAmount: 1000 ether,
            useAnvil: false
        });
    }

    function getBscMainnetConfig() public view returns (NetworkConfig memory) {
        string[] memory currencies = new string[](13);
        currencies[0] = "USD";
        currencies[1] = "EUR";
        currencies[2] = "NGN";
        currencies[3] = "KES";
        currencies[4] = "PHP";
        currencies[5] = "INR";
        currencies[6] = "ZAR";
        currencies[7] = "GHS";
        currencies[8] = "BNB";
        currencies[9] = "NZD"; // New Zealand Dollar
        currencies[10] = "AUD"; // Australian Dollar
        currencies[11] = "TOP"; // Tongan Pa'anga
        currencies[12] = "FJD"; // Fijian Dollar

        address[] memory merchants = new address[](0);

        return NetworkConfig({
            deployerKey: vm.envUint("PRIVATE_KEY"),
            initialOwner: vm.envAddress("INITIAL_OWNER"),
            initialCurrencies: currencies,
            initialMerchants: merchants,
            minFundingAmount: 0.01 ether, // 0.01 BNB
            maxFundingAmount: 10 ether, // 10 BNB
            useAnvil: false
        });
    }

    function getBscTestnetConfig() public view returns (NetworkConfig memory) {
        string[] memory currencies = new string[](13);
        currencies[0] = "USD";
        currencies[1] = "EUR";
        currencies[2] = "NGN";
        currencies[3] = "KES";
        currencies[4] = "PHP";
        currencies[5] = "INR";
        currencies[6] = "ZAR";
        currencies[7] = "GHS";
        currencies[8] = "BNB";
        currencies[9] = "NZD"; // New Zealand Dollar
        currencies[10] = "AUD"; // Australian Dollar
        currencies[11] = "TOP"; // Tongan Pa'anga
        currencies[12] = "FJD"; // Fijian Dollar

        address[] memory merchants = new address[](2);
        merchants[0] = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
        merchants[1] = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC;

        return NetworkConfig({
            deployerKey: vm.envUint("PRIVATE_KEY"),
            initialOwner: vm.envAddress("INITIAL_OWNER"),
            initialCurrencies: currencies,
            initialMerchants: merchants,
            minFundingAmount: 0.01 ether,
            maxFundingAmount: 10 ether,
            useAnvil: false
        });
    }

    function getOrCreateAnvilEthConfig() public returns (NetworkConfig memory) {
        // Check to see if we have set an active network config
        if (localNetworkConfig.deployerKey != 0) {
            return localNetworkConfig;
        }

        // Create mock accounts for testing
        address[] memory mockAccounts = createMockAccounts();
        emit HelperConfig__CreatedMockAccounts(mockAccounts);

        string[] memory currencies = new string[](12);
        currencies[0] = "USD";
        currencies[1] = "EUR";
        currencies[2] = "NGN";
        currencies[3] = "KES";
        currencies[4] = "PHP";
        currencies[5] = "INR";
        currencies[6] = "ZAR";
        currencies[7] = "GHS";
        currencies[8] = "NZD"; // New Zealand Dollar
        currencies[9] = "AUD"; // Australian Dollar
        currencies[10] = "TOP"; // Tongan Pa'anga
        currencies[11] = "FJD"; // Fijian Dollar

        address[] memory merchants = new address[](3);
        merchants[0] = mockAccounts[1]; // Mock merchant 1
        merchants[1] = mockAccounts[2]; // Mock merchant 2
        merchants[2] = mockAccounts[3]; // Mock merchant 3

        localNetworkConfig = NetworkConfig({
            deployerKey: DEFAULT_ANVIL_PRIVATE_KEY,
            initialOwner: mockAccounts[0], // First mock account as owner
            initialCurrencies: currencies,
            initialMerchants: merchants,
            minFundingAmount: 0.01 ether,
            maxFundingAmount: 100 ether,
            useAnvil: true
        });

        return localNetworkConfig;
    }

    /*//////////////////////////////////////////////////////////////
                           HELPER FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    function createMockAccounts() public returns (address[] memory) {
        address[] memory accounts = new address[](10);
        
        for (uint256 i = 0; i < 10; i++) {
            accounts[i] = vm.addr(DEFAULT_ANVIL_PRIVATE_KEY + i);
            vm.deal(accounts[i], 100 ether);
        }
        
        return accounts;
    }

    function getKycLimits(uint8 kycTier) public pure returns (uint256 dailyLimit, uint256 monthlyLimit) {
        if (kycTier == 1) {
            return (0.1 ether, 1 ether);
        } else if (kycTier == 2) {
            return (0.5 ether, 5 ether);
        } else if (kycTier == 3) {
            return (2.5 ether, 25 ether);
        } else {
            revert("Invalid KYC tier");
        }
    }

    function getSupportedRegions() public pure returns (string[] memory) {
        string[] memory regions = new string[](5);
        regions[0] = "africa";
        regions[1] = "asia";
        regions[2] = "oceania"; // Pacific region for NZ, AU, Tonga, Fiji
        regions[3] = "pacific"; // Alternative pacific region identifier
        regions[4] = "global";
        return regions;
    }

    function isTestNetwork() public view returns (bool) {
        uint256 chainId = block.chainid;
        return chainId == SEPOLIA_CHAIN_ID || 
               chainId == POLYGON_MUMBAI_CHAIN_ID || 
               chainId == BSC_TESTNET_CHAIN_ID || 
               chainId == ANVIL_CHAIN_ID;
    }

    function isMainNetwork() public view returns (bool) {
        uint256 chainId = block.chainid;
        return chainId == MAINNET_CHAIN_ID || 
               chainId == POLYGON_CHAIN_ID || 
               chainId == BSC_CHAIN_ID;
    }

    /*//////////////////////////////////////////////////////////////
                           UTILITY FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    function getNetworkName() public view returns (string memory) {
        uint256 chainId = block.chainid;
        
        if (chainId == MAINNET_CHAIN_ID) return "mainnet";
        if (chainId == SEPOLIA_CHAIN_ID) return "sepolia";
        if (chainId == POLYGON_CHAIN_ID) return "polygon";
        if (chainId == POLYGON_MUMBAI_CHAIN_ID) return "mumbai";
        if (chainId == BSC_CHAIN_ID) return "bsc";
        if (chainId == BSC_TESTNET_CHAIN_ID) return "bsc-testnet";
        if (chainId == ANVIL_CHAIN_ID) return "anvil";
        
        return "unknown";
    }

    function getExplorerUrl() public view returns (string memory) {
        uint256 chainId = block.chainid;
        
        if (chainId == MAINNET_CHAIN_ID) return "https://etherscan.io";
        if (chainId == SEPOLIA_CHAIN_ID) return "https://sepolia.etherscan.io";
        if (chainId == POLYGON_CHAIN_ID) return "https://polygonscan.com";
        if (chainId == POLYGON_MUMBAI_CHAIN_ID) return "https://mumbai.polygonscan.com";
        if (chainId == BSC_CHAIN_ID) return "https://bscscan.com";
        if (chainId == BSC_TESTNET_CHAIN_ID) return "https://testnet.bscscan.com";
        
        return "";
    }
}