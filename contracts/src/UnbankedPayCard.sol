// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

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
        string region; // africa, asia, global
        uint256 createdAt;
    }
    
    mapping(uint256 => VirtualCard) public virtualCards;
    mapping(address => uint256[]) public userCards;
    mapping(string => bool) public supportedCurrencies;
    mapping(address => bool) public authorizedMerchants;
    
    event CardCreated(uint256 indexed cardId, address indexed owner, string currency, string region);
    event CardFunded(uint256 indexed cardId, uint256 amount, string currency);
    event CardUsed(uint256 indexed cardId, uint256 amount, address merchant);
    event LimitsUpdated(uint256 indexed cardId, uint256 dailyLimit, uint256 monthlyLimit);
    event CardDeactivated(uint256 indexed cardId);
    event MerchantAuthorized(address indexed merchant);
    event CurrencyAdded(string currency);
    
    constructor() ERC721("UnbankedPayCard", "UPC") {
        // Initialize supported currencies
        supportedCurrencies["USD"] = true;
        supportedCurrencies["EUR"] = true;
        supportedCurrencies["NGN"] = true;
        supportedCurrencies["KES"] = true;
        supportedCurrencies["PHP"] = true;
        supportedCurrencies["INR"] = true;
        supportedCurrencies["ZAR"] = true;
        supportedCurrencies["GHS"] = true;
        
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
    
    function withdrawFromCard(uint256 cardId, uint256 amount) external nonReentrant cardExists(cardId) onlyCardOwner(cardId) {
        require(amount > 0, "Amount must be greater than 0");
        
        VirtualCard storage card = virtualCards[cardId];
        require(card.balance >= amount, "Insufficient balance");
        
        card.balance -= amount;
        
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Withdrawal failed");
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
    
    // Admin functions
    function addSupportedCurrency(string memory currency) external onlyOwner {
        supportedCurrencies[currency] = true;
        emit CurrencyAdded(currency);
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
    
    // Override required by Solidity
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}