import SwiftUI

struct SignInView: View {
  @Environment(\.openURL) private var openURL
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
        openURL(AppConfig.baseURL.appendingPathComponent("api/auth/signin/microsoft"))
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
  }
}
