import SwiftUI
import Combine

struct ContentView: View {
  @StateObject private var authStore = AuthStore()

  var body: some View {
    Group {
      switch authStore.status {
      case .unknown:
        VStack(spacing: 12) {
          ProgressView()
          Text("Checking session...")
            .font(.footnote)
            .foregroundStyle(.secondary)
        }
      case .unauthenticated:
        SignInView(authStore: authStore)
      case .authenticated:
        AppTabView(authStore: authStore)
      }
    }
    .task {
      await authStore.refreshSession()
    }
  }
}

private struct AppTabView: View {
  @ObservedObject var authStore: AuthStore

  var body: some View {
    TabView {
      BrowseView()
        .tabItem {
          Label("Browse", systemImage: "sparkles")
        }

      HistoryView()
        .tabItem {
          Label("History", systemImage: "clock")
        }

      ManageView()
        .tabItem {
          Label("Manage", systemImage: "tray.full")
        }

      AccountView(authStore: authStore)
        .tabItem {
          Label("Account", systemImage: "person.crop.circle")
        }
    }
  }
}

private struct AccountView: View {
  @Environment(\.openURL) private var openURL
  @ObservedObject var authStore: AuthStore

  var body: some View {
    NavigationStack {
      List {
        Section("User") {
          Text(authStore.user?.name ?? "Unknown")
          Text(authStore.user?.email ?? "No email")
            .font(.footnote)
            .foregroundStyle(.secondary)
        }

        Section("Actions") {
          Button("Refresh session") {
            Task {
              await authStore.refreshSession()
            }
          }

          Button("Sign out") {
            authStore.clearToken()
            openURL(AppConfig.baseURL.appendingPathComponent("api/auth/signout"))
          }
        }
      }
      .navigationTitle("Account")
    }
  }
}
