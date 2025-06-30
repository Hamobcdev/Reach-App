// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;
// aderyn-ignore-next-line(unspecific-solidity-pragma)

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract UnbankedPayCard is ERC721, Ownable, ReentrancyGuard {
    uint256 private _cardIdCounter;
    
    struct VirtualCard {
        uint256 id;
        address owner;
        uint256 balance; // in wei
        string currency; // ISO code
        uint256 dailyLimit;
        uint256 monthlyLimit;
        uint256 dailySpent;
        uint256 monthlySpent;
        uint256 lastResetDay;
        uint256 lastResetMonth;
        bool isActive;
        uint8 kycTier; // 1, 2, or 3
        string region; // africa, asia, oceania, pacific, global
        uint256 createdAt;
    }
    
    mapping(uint256 => VirtualCard) public virtualCards;
    mapping(address => uint256[]) public userCards;
    mapping(string => bool) public supportedCurrencies;
    mapping(address => bool) public authorizedMerchants;
    mapping(string => bool) public supportedRegions;
    
    event CardCreated(uint256 indexed cardId, address indexed owner, string currency, string region);
    event CardFunded(uint256 indexed cardId, uint256 amount, string currency);
    event CardUsed(uint256 indexed cardId, uint256 amount, address merchant);
    event LimitsUpdated(uint256 indexed cardId, uint256 dailyLimit, uint256 monthlyLimit);
    event CardDeactivated(uint256 indexed cardId);
    event MerchantAuthorized(address indexed merchant);
    event CurrencyAdded(string currency);
    event RegionAdded(string region);
    event CardWithdrawn(uint256 indexed cardId, uint256 amount, address indexed to);
    
    constructor() ERC721("UnbankedPayCard", "UPC") {
        // Initialize supported currencies including Pacific region
        supportedCurrencies["USD"] = true;
        supportedCurrencies["EUR"] = true;
        supportedCurrencies["NGN"] = true; // Nigerian Naira
        supportedCurrencies["KES"] = true; // Kenyan Shilling
        supportedCurrencies["PHP"] = true; // Philippine Peso
        supportedCurrencies["INR"] = true; // Indian Rupee
        supportedCurrencies["ZAR"] = true; // South African Rand
        supportedCurrencies["GHS"] = true; // Ghanaian Cedi
        supportedCurrencies["NZD"] = true; // New Zealand Dollar
        supportedCurrencies["AUD"] = true; // Australian Dollar
        supportedCurrencies["TOP"] = true; // Tongan Pa'anga
        supportedCurrencies["FJD"] = true; // Fijian Dollar

        // Initialize supported regions
        supportedRegions["africa"] = true;
        supportedRegions["asia"] = true;
        supportedRegions["oceania"] = true; // Pacific region
        supportedRegions["pacific"] = true; // Alternative pacific identifier
        supportedRegions["global"] = true;
        
        _cardIdCounter = 0;
    }
    
    modifier cardExists(uint256 cardId) {
        require(_exists(cardId), "Card does not exist");
        _;
    }
    
    modifier onlyCardOwner(uint256 cardId) {
        require(ownerOf(cardId) == msg.sender, "Not card owner");
        _;
    }
    
    modifier cardActive(uint256 cardId) {
        require(virtualCards[cardId].isActive, "Card is not active");
        _;
    }
    
    function createCard(
        string memory currency,
        string memory region,
        uint8 kycTier
    ) external returns (uint256) {
        require(supportedCurrencies[currency], "Currency not supported");
        require(supportedRegions[region], "Region not supported");
        require(kycTier >= 1 && kycTier <= 3, "Invalid KYC tier");
        
        _cardIdCounter++;
        uint256 newCardId = _cardIdCounter;
        
        // Set limits based on KYC tier (in wei for simplicity)
        uint256 dailyLimit = kycTier == 1 ? 0.1 ether : kycTier == 2 ? 0.5 ether : 2.5 ether;
        uint256 monthlyLimit = kycTier == 1 ? 1 ether : kycTier == 2 ? 5 ether : 25 ether;
        
        virtualCards[newCardId] = VirtualCard({
            id: newCardId,
            owner: msg.sender,
            balance: 0,
            currency: currency,
            dailyLimit: dailyLimit,
            monthlyLimit: monthlyLimit,
            dailySpent: 0,
            monthlySpent: 0,
            lastResetDay: block.timestamp / 1 days,
            lastResetMonth: block.timestamp / 30 days,
            isActive: true,
            kycTier: kycTier,
            region: region,
            createdAt: block.timestamp
        });
        
        userCards[msg.sender].push(newCardId);
        _safeMint(msg.sender, newCardId);
        
        emit CardCreated(newCardId, msg.sender, currency, region);
        return newCardId;
    }
    
    function fundCard(uint256 cardId) external payable nonReentrant cardExists(cardId) cardActive(cardId) {
        require(msg.value > 0, "Must send ETH to fund card");
        
        VirtualCard storage card = virtualCards[cardId];
        card.balance += msg.value;
        
        emit CardFunded(cardId, msg.value, card.currency);
    }
    
    function useCard(
        uint256 cardId,
        uint256 amount,
        address merchant
    ) external nonReentrant cardExists(cardId) onlyCardOwner(cardId) cardActive(cardId) {
        require(amount > 0, "Amount must be greater than 0");
        require(merchant != address(0), "Invalid merchant address");
        
        VirtualCard storage card = virtualCards[cardId];
        require(card.balance >= amount, "Insufficient balance");
        
        // Reset daily/monthly limits if needed
        _resetLimitsIfNeeded(cardId);
        
        // Check limits
        require(card.dailySpent + amount <= card.dailyLimit, "Daily limit exceeded");
        require(card.monthlySpent + amount <= card.monthlyLimit, "Monthly limit exceeded");
        
        // Update balances and spending
        card.balance -= amount;
        card.dailySpent += amount;
        card.monthlySpent += amount;
        
        // Transfer to merchant
        (bool success, ) = payable(merchant).call{value: amount}("");
        require(success, "Transfer to merchant failed");
        
        emit CardUsed(cardId, amount, merchant);
    }
        
    function _resetLimitsIfNeeded(uint256 cardId) internal {
        VirtualCard storage card = virtualCards[cardId];
        uint256 currentDay = block.timestamp / 1 days;
        uint256 currentMonth = block.timestamp / 30 days;
        
        if (currentDay > card.lastResetDay) {
            card.dailySpent = 0;
            card.lastResetDay = currentDay;
        }
        
        if (currentMonth > card.lastResetMonth) {
            card.monthlySpent = 0;
            card.lastResetMonth = currentMonth;
        }
    }
    
    function getCard(uint256 cardId) external view cardExists(cardId) returns (VirtualCard memory) {
        return virtualCards[cardId];
    }
    
    function getUserCards(address user) external view returns (uint256[] memory) {
        return userCards[user];
    }
    
    function getCardBalance(uint256 cardId) external view cardExists(cardId) returns (uint256) {
        return virtualCards[cardId].balance;
    }
    
    function getRemainingLimits(uint256 cardId) external view cardExists(cardId) returns (uint256 dailyRemaining, uint256 monthlyRemaining) {
        VirtualCard memory card = virtualCards[cardId];
        
        // Calculate current day and month
        uint256 currentDay = block.timestamp / 1 days;
        uint256 currentMonth = block.timestamp / 30 days;
        
        // Reset counters if needed for calculation
        uint256 dailySpent = (currentDay > card.lastResetDay) ? 0 : card.dailySpent;
        uint256 monthlySpent = (currentMonth > card.lastResetMonth) ? 0 : card.monthlySpent;
        
        dailyRemaining = card.dailyLimit > dailySpent ? card.dailyLimit - dailySpent : 0;
        monthlyRemaining = card.monthlyLimit > monthlySpent ? card.monthlyLimit - monthlySpent : 0;
    }
    
    function getCardsByRegion(string memory region) external view returns (uint256[] memory) {
        require(supportedRegions[region], "Region not supported");
        
        uint256 count = 0;
        // Count cards in the region first
        for (uint256 i = 1; i <= _cardIdCounter; i++) {
            if (keccak256(bytes(virtualCards[i].region)) == keccak256(bytes(region))) {
                count++;
            }
        }
        
        // Create array and populate
        uint256[] memory regionCards = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 1; i <= _cardIdCounter; i++) {
            if (keccak256(bytes(virtualCards[i].region)) == keccak256(bytes(region))) {
                regionCards[index] = i;
                index++;
            }
        }
        
        return regionCards;
    }
    
    function getCardsByCurrency(string memory currency) external view returns (uint256[] memory) {
        require(supportedCurrencies[currency], "Currency not supported");
        
        uint256 count = 0;
        // Count cards with the currency first
        for (uint256 i = 1; i <= _cardIdCounter; i++) {
            if (keccak256(bytes(virtualCards[i].currency)) == keccak256(bytes(currency))) {
                count++;
            }
        }
        
        // Create array and populate
        uint256[] memory currencyCards = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 1; i <= _cardIdCounter; i++) {
            if (keccak256(bytes(virtualCards[i].currency)) == keccak256(bytes(currency))) {
                currencyCards[index] = i;
                index++;
            }
        }
        
        return currencyCards;
    }
    
    // Admin functions
    function addSupportedCurrency(string memory currency) external onlyOwner {
        supportedCurrencies[currency] = true;
        emit CurrencyAdded(currency);
    }
    
    function addSupportedRegion(string memory region) external onlyOwner {
        supportedRegions[region] = true;
        emit RegionAdded(region);
    }
    
    function authorizeMerchant(address merchant) external onlyOwner {
        authorizedMerchants[merchant] = true;
        emit MerchantAuthorized(merchant);
    }
    
    function deactivateCard(uint256 cardId) external cardExists(cardId) {
        require(ownerOf(cardId) == msg.sender || msg.sender == owner(), "Not authorized");
        virtualCards[cardId].isActive = false;
        emit CardDeactivated(cardId);
    }
    
    function updateCardLimits(uint256 cardId, uint256 newDailyLimit, uint256 newMonthlyLimit) external onlyOwner cardExists(cardId) {
        VirtualCard storage card = virtualCards[cardId];
        card.dailyLimit = newDailyLimit;
        card.monthlyLimit = newMonthlyLimit;
        emit LimitsUpdated(cardId, newDailyLimit, newMonthlyLimit);
    }
    
    // Emergency functions
    function emergencyPause(uint256 cardId) external cardExists(cardId) {
        require(ownerOf(cardId) == msg.sender, "Not card owner");
        virtualCards[cardId].isActive = false;
        emit CardDeactivated(cardId);
    }
    
    function getTotalCards() external view returns (uint256) {
        return _cardIdCounter;
    }
    
    function getSupportedCurrencies() external pure returns (string[] memory) {
        string[] memory currencies = new string[](12);
        currencies[0] = "USD";
        currencies[1] = "EUR";
        currencies[2] = "NGN";
        currencies[3] = "KES";
        currencies[4] = "PHP";
        currencies[5] = "INR";
        currencies[6] = "ZAR";
        currencies[7] = "GHS";
        currencies[8] = "NZD";
        currencies[9] = "AUD";
        currencies[10] = "TOP";
        currencies[11] = "FJD";
        return currencies;
    }
    
    function getSupportedRegions() external pure returns (string[] memory) {
        string[] memory regions = new string[](5);
        regions[0] = "africa";
        regions[1] = "asia";
        regions[2] = "oceania";
        regions[3] = "pacific";
        regions[4] = "global";
        return regions;
    }
    
    function isCurrencySupported(string memory currency) external view returns (bool) {
        return supportedCurrencies[currency];
    }
    
    function isRegionSupported(string memory region) external view returns (bool) {
        return supportedRegions[region];
    }
    
    // Override required by Solidity
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}