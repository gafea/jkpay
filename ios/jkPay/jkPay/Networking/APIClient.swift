import Foundation

enum NetworkError: LocalizedError {
  case invalidResponse
  case httpStatus(Int, String)
  case decodingFailed

  var errorDescription: String? {
    switch self {
    case .invalidResponse:
      return "Invalid server response."
    case let .httpStatus(code, message):
      return message.isEmpty ? "Request failed (status: \(code))." : message
    case .decodingFailed:
      return "Failed to decode server response."
    }
  }
}

final class APIClient {
  static let shared = APIClient()

  private let baseURL: URL
  private let session: URLSession
  private let decoder: JSONDecoder
  private let encoder: JSONEncoder

  init(baseURL: URL = AppConfig.baseURL) {
    self.baseURL = baseURL
    let config = URLSessionConfiguration.default
    config.httpCookieStorage = HTTPCookieStorage.shared
    config.requestCachePolicy = .reloadIgnoringLocalCacheData
    self.session = URLSession(configuration: config)
    self.decoder = JSONDecoder()
    self.decoder.dateDecodingStrategy = .iso8601
    self.encoder = JSONEncoder()
  }

  func get<T: Decodable>(_ path: String) async throws -> T {
    return try await request(path, method: "GET", body: nil)
  }

  func post<T: Decodable, Body: Encodable>(_ path: String, body: Body) async throws -> T {
    let payload = try encoder.encode(body)
    return try await request(path, method: "POST", body: payload)
  }

  func postVoid<Body: Encodable>(_ path: String, body: Body) async throws {
    let payload = try encoder.encode(body)
    _ = try await request(path, method: "POST", body: payload) as EmptyResponse
  }

  private func request<T: Decodable>(_ path: String, method: String, body: Data?) async throws -> T {
    guard let url = URL(string: path, relativeTo: baseURL) else {
      throw NetworkError.invalidResponse
    }

    var request = URLRequest(url: url)
    request.httpMethod = method
    if let body {
      request.httpBody = body
      request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    }

    let (data, response) = try await session.data(for: request)
    guard let http = response as? HTTPURLResponse else {
      throw NetworkError.invalidResponse
    }

    guard (200...299).contains(http.statusCode) else {
      let message = String(data: data, encoding: .utf8) ?? ""
      throw NetworkError.httpStatus(http.statusCode, message)
    }

    guard !data.isEmpty else {
      throw NetworkError.decodingFailed
    }

    do {
      return try decoder.decode(T.self, from: data)
    } catch {
      throw NetworkError.decodingFailed
    }
  }
}

private struct EmptyResponse: Decodable {}
