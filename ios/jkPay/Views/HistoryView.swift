import SwiftUI

struct HistoryView: View {
  @StateObject private var viewModel = HistoryViewModel()

  private static let dateFormatter: DateFormatter = {
    let formatter = DateFormatter()
    formatter.dateStyle = .medium
    formatter.timeStyle = .short
    return formatter
  }()

  var body: some View {
    NavigationStack {
      Group {
        if viewModel.isLoading && viewModel.requests.isEmpty {
          ProgressView("Loading history...")
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
        } else {
          List(viewModel.requests) { request in
            VStack(alignment: .leading, spacing: 6) {
              Text(request.benefitName)
                .font(.headline)
              Text("Spent: \(request.amountSpent, format: .number.precision(.fractionLength(2)))")
                .font(.subheadline)
              Text("Channel: \(request.purchaseChannel)")
                .font(.caption)
                .foregroundStyle(.secondary)
              Text("Status: \(request.status)")
                .font(.caption)
                .foregroundStyle(.secondary)
              Text(Self.dateFormatter.string(from: request.createdAt))
                .font(.caption2)
                .foregroundStyle(.secondary)
            }
            .padding(.vertical, 4)
          }
        }
      }
      .navigationTitle("History")
    }
    .task {
      await viewModel.load()
    }
    .refreshable {
      await viewModel.load()
    }
  }
}
