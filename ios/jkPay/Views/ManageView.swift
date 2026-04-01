import SwiftUI

struct ManageView: View {
  @StateObject private var viewModel = ManageViewModel()

  var body: some View {
    NavigationStack {
      Group {
        if viewModel.isLoading && viewModel.data == nil {
          ProgressView("Loading manage data...")
        } else if let errorMessage = viewModel.errorMessage {
          VStack(spacing: 12) {
            Text(errorMessage)
              .multilineTextAlignment(.center)
              .foregroundStyle(.secondary)
            Button("Retry") {
              Task {
                await viewModel.load()
              }
            }
          }
          .padding()
        } else if let data = viewModel.data {
          List {
            Section("Friends") {
              ForEach(data.friends) { friend in
                VStack(alignment: .leading, spacing: 4) {
                  Text(friend.email)
                    .font(.headline)
                  if !friend.nickname.isEmpty {
                    Text(friend.nickname)
                      .font(.subheadline)
                      .foregroundStyle(.secondary)
                  }
                  if !friend.activeUntil.isEmpty {
                    Text("Active until: \(friend.activeUntil)")
                      .font(.caption)
                      .foregroundStyle(.secondary)
                  }
                  if friend.isDisabled {
                    Text("Disabled")
                      .font(.caption)
                      .foregroundStyle(.red)
                  }
                }
                .padding(.vertical, 4)
              }
            }

            Section("Cards") {
              ForEach(data.cards) { card in
                VStack(alignment: .leading, spacing: 4) {
                  Text(card.name)
                    .font(.headline)
                  if !card.fcyFee.isEmpty {
                    Text("FX fee: \(card.fcyFee)%")
                      .font(.caption)
                      .foregroundStyle(.secondary)
                  }
                  Text(card.isCredit ? "Credit" : "Debit")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                }
                .padding(.vertical, 4)
              }
            }

            Section("Benefits") {
              ForEach(data.benefits) { benefit in
                VStack(alignment: .leading, spacing: 4) {
                  Text(benefit.categoryName)
                    .font(.headline)
                  Text("Cashback: \(benefit.cashbackAmount)")
                    .font(.subheadline)
                  if !benefit.expiryDate.isEmpty {
                    Text("Expiry: \(benefit.expiryDate)")
                      .font(.caption)
                      .foregroundStyle(.secondary)
                  }
                }
                .padding(.vertical, 4)
              }
            }

            Section("Server Variables") {
              ForEach(data.serverVariables) { variable in
                VStack(alignment: .leading, spacing: 4) {
                  Text(variable.key)
                    .font(.headline)
                  Text(variable.value.isEmpty ? "(empty)" : variable.value)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                }
                .padding(.vertical, 4)
              }
            }
          }
        }
      }
      .navigationTitle("Manage")
    }
    .task {
      await viewModel.load()
    }
    .refreshable {
      await viewModel.load()
    }
  }
}
