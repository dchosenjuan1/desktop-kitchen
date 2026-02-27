import SwiftUI

struct CachedAsyncImage: View {
    let url: URL?
    var placeholderIcon: String = "photo"

    @State private var loadedImage: UIImage?
    @State private var isLoading = false

    var body: some View {
        Group {
            if let loadedImage {
                Image(uiImage: loadedImage)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } else if isLoading {
                ZStack {
                    AppColors.surface
                    ProgressView().tint(AppColors.textMuted)
                }
            } else {
                ZStack {
                    AppColors.surface
                    Image(systemName: placeholderIcon)
                        .font(.system(size: 28))
                        .foregroundStyle(AppColors.textMuted)
                }
            }
        }
        .clipped()
        .task(id: url) { await loadImage() }
    }

    private func loadImage() async {
        guard let url else { return }

        if let cached = await ImageCache.shared.image(for: url) {
            loadedImage = cached
            return
        }

        isLoading = true
        defer { isLoading = false }

        do {
            let (data, response) = try await URLSession.shared.data(from: url)
            guard let httpResponse = response as? HTTPURLResponse,
                  (200...299).contains(httpResponse.statusCode),
                  let image = UIImage(data: data) else { return }
            await ImageCache.shared.setImage(image, for: url)
            loadedImage = image
        } catch {
            // silently fail — placeholder stays visible
        }
    }
}
