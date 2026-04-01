import SwiftUI
import Combine
import SafariServices

struct SignInView: View {
  @State private var signInURL: URL? = nil
  @State private var isShowingSignIn = false
  @ObservedObject var authStore: AuthStore

  var body: some View {
    VStack(spacing: 16) {
      Text("jkPay")
        .font(.largeTitle.bold())

      Text("Sign in with your Microsoft account to access your benefits.")
        .multilineTextAlignment(.center)
        .foregroundStyle(.secondary)
        .padding(.horizontal)

      Button("Sign in with Microsoft") {
        var components = URLComponents(url: AppConfig.baseURL, resolvingAgainstBaseURL: false)
        let browseURL = AppConfig.baseURL.appendingPathComponent("browse").absoluteString
        components?.queryItems = [
          URLQueryItem(name: "autoredirect", value: "1"),
          URLQueryItem(name: "callbackUrl", value: browseURL)
        ]

        if let url = components?.url {
          signInURL = url
          isShowingSignIn = true
        }
      }
      .buttonStyle(.borderedProminent)

      Button("Refresh session") {
        Task {
          await authStore.refreshSession()
        }
      }
      .buttonStyle(.bordered)

      Text("Complete sign-in in the browser, then return here and refresh.")
        .font(.footnote)
        .foregroundStyle(.secondary)
        .multilineTextAlignment(.center)
        .padding(.horizontal)
    }
    .padding()
    .sheet(
      isPresented: $isShowingSignIn,
      onDismiss: {
        Task {
          await authStore.refreshSession()
        }
      }
    ) {
      if let signInURL {
        InAppSafariView(url: signInURL)
          .ignoresSafeArea()
      }
    }
  }
}

private struct InAppSafariView: UIViewControllerRepresentable {
  let url: URL

  func makeUIViewController(context: Context) -> SFSafariViewController {
    let controller = SFSafariViewController(url: url)
    controller.dismissButtonStyle = .close
    return controller
  }

  func updateUIViewController(_ uiViewController: SFSafariViewController, context: Context) {
    // No-op: URL is fixed for this presentation.
  }
}
