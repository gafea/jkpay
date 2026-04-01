import SwiftUI

private let channelOptions = ["ONLINE_PURCHASE", "OFFLINE_PURCHASE", "FOREIGN_CURRENCY"]

struct BrowseView: View {
  @StateObject private var viewModel = BrowseViewModel()
  @State private var selectedBenefit: Benefit? = nil

  private var groupedBenefits: [(key: String, values: [Benefit])] {
    let grouped = Dictionary(grouping: viewModel.benefits) { benefit in
      benefit.categoryName.isEmpty ? "Uncategorized" : benefit.categoryName
    }
    return grouped.keys.sorted().map { key in
      (key: key, values: grouped[key] ?? [])
    }
  }

  var body: some View {
    NavigationStack {
      Group {
        if viewModel.isLoading && viewModel.benefits.isEmpty {
          ProgressView("Loading benefits...")
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
          List {
            ForEach(groupedBenefits, id: \.key) { group in
              Section(group.key) {
                ForEach(group.values) { benefit in
                  BenefitRow(benefit: benefit) {
                    selectedBenefit = benefit
                  }
                }
              }
            }
          }
        }
      }
      .navigationTitle("Browse")
    }
    .task {
      await viewModel.load()
    }
    .refreshable {
      await viewModel.load()
    }
    .sheet(item: $selectedBenefit) { benefit in
      RequestSheet(benefit: benefit) {
        Task {
          await viewModel.load()
        }
      }
    }
  }
}

private struct BenefitRow: View {
  let benefit: Benefit
  let onRequest: () -> Void

  private var cashbackText: String {
    if benefit.cashbackType == "PERCENTAGE" {
      return String(format: "%.2f%% cashback", benefit.cashbackAmount)
    }
    return String(format: "$%.2f cash", benefit.cashbackAmount)
  }

  private var cardNames: String {
    benefit.cardLinks.map { $0.card.name }.joined(separator: ", ")
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      Text(cashbackText)
        .font(.subheadline.weight(.semibold))

      if !cardNames.isEmpty {
        Text("Cards: \(cardNames)")
          .font(.caption)
          .foregroundStyle(.secondary)
      }

      if let expiryDate = benefit.expiryDate {
        Text("Expires: \(expiryDate.formatted(date: .abbreviated, time: .omitted))")
          .font(.caption)
          .foregroundStyle(.secondary)
      }

      Button("Request") {
        onRequest()
      }
      .buttonStyle(.bordered)
    }
    .padding(.vertical, 4)
  }
}

private struct RequestSheet: View {
  let benefit: Benefit
  let onComplete: () -> Void

  @Environment(\.dismiss) private var dismiss
  @State private var amountSpent = ""
  @State private var purchaseChannel: String
  @State private var isSubmitting = false
  @State private var errorMessage: String? = nil

  init(benefit: Benefit, onComplete: @escaping () -> Void) {
    self.benefit = benefit
    self.onComplete = onComplete
    _purchaseChannel = State(initialValue: benefit.purchaseChannel ?? channelOptions.first ?? "")
  }

  var body: some View {
    NavigationStack {
      Form {
        Section("Benefit") {
          Text(benefit.categoryName.isEmpty ? "Uncategorized" : benefit.categoryName)
          Text(benefit.cashbackType == "PERCENTAGE"
               ? String(format: "%.2f%% cashback", benefit.cashbackAmount)
               : String(format: "$%.2f cash", benefit.cashbackAmount))
            .font(.footnote)
            .foregroundStyle(.secondary)
        }

        Section("Request") {
          #if os(iOS)
          TextField("Amount spent", text: $amountSpent)
            .keyboardType(.decimalPad)
          #else
          TextField("Amount spent", text: $amountSpent)
          #endif

          if benefit.purchaseChannel == nil {
            Picker("Purchase channel", selection: $purchaseChannel) {
              ForEach(channelOptions, id: \.self) { option in
                Text(option).tag(option)
              }
            }
          } else {
            Text("Purchase channel: \(benefit.purchaseChannel ?? "")")
              .font(.footnote)
              .foregroundStyle(.secondary)
          }
        }

        if let errorMessage {
          Section {
            Text(errorMessage)
              .foregroundStyle(.red)
          }
        }
      }
      .navigationTitle("Submit Request")
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("Cancel") {
            dismiss()
          }
        }
        ToolbarItem(placement: .confirmationAction) {
          Button(isSubmitting ? "Submitting..." : "Submit") {
            Task {
              await submitRequest()
            }
          }
          .disabled(isSubmitting)
        }
      }
    }
  }

  private func submitRequest() async {
    errorMessage = nil

    guard let amountValue = Double(amountSpent), amountValue > 0 else {
      errorMessage = "Enter a valid amount."
      return
    }

    let channel = benefit.purchaseChannel ?? purchaseChannel
    guard !channel.isEmpty else {
      errorMessage = "Select a purchase channel."
      return
    }

    let estimatedCashback: Double
    if benefit.cashbackType == "PERCENTAGE" {
      estimatedCashback = (amountValue * benefit.cashbackAmount) / 100
    } else {
      estimatedCashback = benefit.cashbackAmount
    }

    isSubmitting = true
    defer { isSubmitting = false }

    do {
      try await APIClient.shared.postVoid(
        "/api/history",
        body: CreateHistoryRequest(
          benefitId: benefit.id,
          amountSpent: amountValue,
          purchaseChannel: channel,
          estimatedCashback: estimatedCashback
        )
      )
      onComplete()
      dismiss()
    } catch {
      errorMessage = error.localizedDescription
    }
  }
}
