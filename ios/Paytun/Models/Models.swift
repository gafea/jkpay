import Foundation

struct BrowseResponse: Decodable {
  let benefits: [Benefit]
}

struct Benefit: Decodable, Identifiable {
  let id: String
  let categoryName: String
  let expiryDate: Date?
  let cashbackType: String
  let cashbackAmount: Double
  let quotaType: String
  let usageAvailable: Double?
  let usageUsed: Double
  let quotaResetsMonthly: Bool
  let minimumSpending: Double?
  let maximumSpending: Double?
  let applicableWeekdays: [String]
  let purchaseChannel: String?
  let cardLinks: [BenefitCardLink]
}

struct BenefitCardLink: Decodable {
  let cardId: String
  let card: Card
}

struct Card: Decodable, Identifiable {
  let id: String
  let name: String
  let fcyFee: Double?
  let isCredit: Bool
}

struct HistoryResponse: Decodable {
  let requests: [HistoryItem]
}

struct HistoryItem: Decodable, Identifiable {
  let id: String
  let createdAt: Date
  let benefitId: String
  let benefitName: String
  let amountSpent: Double
  let purchaseChannel: String
  let status: String
}

struct ManageResponse: Decodable {
  let friends: [Friend]
  let cards: [ManageCard]
  let benefits: [ManageBenefit]
  let weekdayOptions: [String]
  let channelOptions: [String]
  let serverVariables: [ServerVariable]
}

struct Friend: Decodable, Identifiable {
  let id: String
  let email: String
  let nickname: String
  let fcmToken: String
  let activeUntil: String
  let isDisabled: Bool
}

struct ManageCard: Decodable, Identifiable {
  let id: String
  let name: String
  let fcyFee: String
  let isCredit: Bool
  let isDisabled: Bool
}

struct ManageBenefit: Decodable, Identifiable {
  let id: String
  let categoryName: String
  let expiryDate: String
  let cashbackType: String
  let cashbackAmount: String
  let quotaType: String
  let usageAvailable: String
  let usageUsed: Double?
  let quotaResetsMonthly: Bool
  let minimumSpending: String
  let maximumSpending: String
  let applicableWeekdays: [String]
  let purchaseChannel: String
  let linkedCardIds: [String]
}

struct ServerVariable: Decodable, Identifiable {
  let key: String
  let value: String
  let readOnly: Bool

  var id: String {
    key
  }
}

struct SessionResponse: Decodable {
  let user: SessionUser
}

struct SessionUser: Decodable {
  let id: String
  let email: String
  let name: String
}

struct CreateHistoryRequest: Encodable {
  let benefitId: String
  let amountSpent: Double
  let purchaseChannel: String
  let estimatedCashback: Double
}
