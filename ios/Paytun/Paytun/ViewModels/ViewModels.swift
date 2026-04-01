import Foundation
import Combine

enum AuthStatus {
  case unknown
  case authenticated
  case unauthenticated
}

@MainActor
final class AuthStore: ObservableObject {
  @Published var status: AuthStatus = .unknown
  @Published var user: SessionUser? = nil
  @Published var token: String? = nil

  private let tokenKey = "paytun.authToken"

  init() {
    let storedToken = UserDefaults.standard.string(forKey: tokenKey)
    token = storedToken
    APIClient.shared.authToken = storedToken
  }

  func setToken(_ newValue: String?) {
    token = newValue
    APIClient.shared.authToken = newValue
    if let newValue, !newValue.isEmpty {
      UserDefaults.standard.set(newValue, forKey: tokenKey)
    } else {
      UserDefaults.standard.removeObject(forKey: tokenKey)
    }
  }

  func clearToken() {
    setToken(nil)
    user = nil
    status = .unauthenticated
  }

  func completeMobileSignIn(token: String) async {
    setToken(token)
    await refreshSession()
  }

  func refreshSession() async {
    do {
      let response: SessionResponse = try await APIClient.shared.get("/api/session")
      user = response.user
      status = .authenticated
    } catch let error as NetworkError {
      if case .httpStatus(let code, _) = error, code == 401 {
        clearToken()
      } else {
        user = nil
        status = .unauthenticated
      }
    } catch {
      user = nil
      status = .unauthenticated
    }
  }
}

@MainActor
final class BrowseViewModel: ObservableObject {
  @Published var benefits: [Benefit] = []
  @Published var isLoading = false
  @Published var errorMessage: String? = nil

  func load() async {
    isLoading = true
    errorMessage = nil
    do {
      let response: BrowseResponse = try await APIClient.shared.get("/api/browse")
      benefits = response.benefits.filter { !$0.cardLinks.isEmpty }
    } catch {
      errorMessage = error.localizedDescription
    }
    isLoading = false
  }
}

@MainActor
final class HistoryViewModel: ObservableObject {
  @Published var requests: [HistoryItem] = []
  @Published var isLoading = false
  @Published var errorMessage: String? = nil

  func load() async {
    isLoading = true
    errorMessage = nil
    do {
      let response: HistoryResponse = try await APIClient.shared.get("/api/history")
      requests = response.requests
    } catch {
      errorMessage = error.localizedDescription
    }
    isLoading = false
  }
}

@MainActor
final class ManageViewModel: ObservableObject {
  @Published var data: ManageResponse? = nil
  @Published var isLoading = false
  @Published var errorMessage: String? = nil

  func load() async {
    isLoading = true
    errorMessage = nil
    do {
      let response: ManageResponse = try await APIClient.shared.get("/api/manage")
      data = response
    } catch {
      errorMessage = error.localizedDescription
    }
    isLoading = false
  }
}
