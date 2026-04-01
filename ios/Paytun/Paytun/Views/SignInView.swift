import SwiftUI
import AuthenticationServices
#if os(iOS)
import UIKit
#elseif os(macOS)
import AppKit
#endif

struct SignInView: View {
  @State private var authSession: ASWebAuthenticationSession? = nil
  @ObservedObject var authStore: AuthStore

  var body: some View {
    VStack(spacing: 16) {
      Text("Paytun")
        .font(.largeTitle.bold())

      Text("Sign in with your Microsoft account to access your benefits.")
        .multilineTextAlignment(.center)
        .foregroundStyle(.secondary)
        .padding(.horizontal)

      Button("Sign in with Microsoft") {
        startSignIn()
      }
      .buttonStyle(.borderedProminent)

      Button("Refresh session") {
        Task {
          await authStore.refreshSession()
        }
      }
      .buttonStyle(.bordered)

      Text("Complete sign-in in the browser to return here automatically.")
        .font(.footnote)
        .foregroundStyle(.secondary)
        .multilineTextAlignment(.center)
        .padding(.horizontal)
    }
    .padding()
  }

  private func startSignIn() {
    let signInURL = AppConfig.baseURL.appendingPathComponent("api/mobile/auth")
    let session = ASWebAuthenticationSession(
      url: signInURL,
      callbackURLScheme: AppConfig.authCallbackScheme
    ) { callbackURL, error in
      guard error == nil, let callbackURL else {
        return
      }

      guard let components = URLComponents(url: callbackURL, resolvingAgainstBaseURL: false),
            let token = components.queryItems?.first(where: { $0.name == "token" })?.value,
            !token.isEmpty
      else {
        return
      }

      Task {
        await authStore.completeMobileSignIn(token: token)
      }
    }

    session.presentationContextProvider = AuthPresentationContextProvider.shared
    session.prefersEphemeralWebBrowserSession = false
    session.start()
    authSession = session
  }
}

private final class AuthPresentationContextProvider: NSObject, ASWebAuthenticationPresentationContextProviding {
  static let shared = AuthPresentationContextProvider()

  func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
    #if os(iOS)
    let scenes = UIApplication.shared.connectedScenes
    let windowScene = scenes.first { $0.activationState == .foregroundActive } as? UIWindowScene
    let window = windowScene?.windows.first { $0.isKeyWindow }
    return window ?? ASPresentationAnchor()
    #elseif os(macOS)
    return NSApplication.shared.windows.first ?? ASPresentationAnchor()
    #else
    return ASPresentationAnchor()
    #endif
  }
}
