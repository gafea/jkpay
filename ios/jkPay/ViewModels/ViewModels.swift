import Foundation

enum AuthStatus {
  case unknown
  case authenticated
  case unauthenticated
}

@MainActor
final class AuthStore: ObservableObject {
  @Published var status: AuthStatus = .unknown
  @Published var user: SessionUser? = nil

  func refreshSession() async {
    do {
      let response: SessionResponse = try await APIClient.shared.get("/api/session")
      user = response.user
      status = .authenticated
    } catch let error as NetworkError {
      if case .httpStatus(let code, _) = error, code == 401 {
        user = nil
        status = .unauthenticated
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
