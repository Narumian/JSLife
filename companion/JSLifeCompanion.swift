import AppKit
import Foundation

@main
enum JSLifeCompanionApplication {
    static func main() {
        let application = NSApplication.shared
        let delegate = AppDelegate()
        application.setActivationPolicy(.regular)
        application.delegate = delegate
        application.run()
    }
}

final class AppDelegate: NSObject, NSApplicationDelegate {
    private var window: NSWindow!
    private var statusLabel: NSTextField!
    private var detailLabel: NSTextField!
    private var loginButton: NSButton!
    private var bridgeProcess: Process?
    private var loginProcess: Process?

    private var resourcesURL: URL { Bundle.main.resourceURL! }
    private var nodeURL: URL { resourcesURL.appendingPathComponent("runtime/bin/node") }
    private var codexURL: URL { resourcesURL.appendingPathComponent("runtime/bin/codex") }
    private var serverURL: URL { resourcesURL.appendingPathComponent("server/codex-bridge.mjs") }

    private var pairingToken: String {
        if let existing = UserDefaults.standard.string(forKey: "pairingToken"), !existing.isEmpty {
            return existing
        }
        let token = UUID().uuidString.replacingOccurrences(of: "-", with: "").lowercased()
        UserDefaults.standard.set(token, forKey: "pairingToken")
        return token
    }

    func applicationWillFinishLaunching(_ notification: Notification) {
        NSAppleEventManager.shared().setEventHandler(
            self,
            andSelector: #selector(handleURL(event:reply:)),
            forEventClass: AEEventClass(kInternetEventClass),
            andEventID: AEEventID(kAEGetURL)
        )
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        buildWindow()
        startBridge()
        refreshLoginStatus()
        showWindow()
    }

    func applicationDidBecomeActive(_ notification: Notification) {
        if window != nil, !window.isVisible {
            showWindow()
        }
    }

    func applicationWillTerminate(_ notification: Notification) {
        bridgeProcess?.terminate()
        loginProcess?.terminate()
        NSAppleEventManager.shared().removeEventHandler(
            forEventClass: AEEventClass(kInternetEventClass),
            andEventID: AEEventID(kAEGetURL)
        )
    }

    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        showWindow()
        return true
    }

    private func showWindow() {
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    private func buildWindow() {
        window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 440, height: 260),
            styleMask: [.titled, .closable, .miniaturizable],
            backing: .buffered,
            defer: false
        )
        window.center()
        window.title = "JSLIFE Companion"
        window.isReleasedWhenClosed = false

        let title = NSTextField(labelWithString: "JSLIFE Companion")
        title.font = .systemFont(ofSize: 22, weight: .semibold)
        title.textColor = NSColor(calibratedRed: 0.78, green: 1.0, blue: 0.27, alpha: 1)

        statusLabel = NSTextField(labelWithString: "起動中…")
        statusLabel.font = .systemFont(ofSize: 14, weight: .medium)

        detailLabel = NSTextField(wrappingLabelWithString: "GitHub Pages版JSLIFEと、このMacのCodexを安全に接続します。")
        detailLabel.textColor = .secondaryLabelColor
        detailLabel.maximumNumberOfLines = 3

        loginButton = NSButton(title: "ChatGPTで接続", target: self, action: #selector(startLogin))
        loginButton.bezelStyle = .rounded
        loginButton.keyEquivalent = "\r"

        let refreshButton = NSButton(title: "状態を確認", target: self, action: #selector(refreshStatusButton))
        refreshButton.bezelStyle = .rounded

        let buttons = NSStackView(views: [loginButton, refreshButton])
        buttons.orientation = .horizontal
        buttons.spacing = 8

        let stack = NSStackView(views: [title, statusLabel, detailLabel, buttons])
        stack.orientation = .vertical
        stack.alignment = .leading
        stack.spacing = 14
        stack.translatesAutoresizingMaskIntoConstraints = false

        let content = NSView()
        content.addSubview(stack)
        window.contentView = content
        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: content.leadingAnchor, constant: 28),
            stack.trailingAnchor.constraint(equalTo: content.trailingAnchor, constant: -28),
            stack.topAnchor.constraint(equalTo: content.topAnchor, constant: 28),
        ])
    }

    private func startBridge() {
        guard bridgeProcess?.isRunning != true else { return }
        let process = Process()
        process.executableURL = nodeURL
        process.arguments = [serverURL.path]
        process.currentDirectoryURL = resourcesURL.appendingPathComponent("server")
        var environment = ProcessInfo.processInfo.environment
        environment["JSLIFE_CODEX_PATH"] = codexURL.path
        environment["JSLIFE_COMPANION_TOKEN"] = pairingToken
        process.environment = environment
        process.standardOutput = Pipe()
        process.standardError = Pipe()
        process.terminationHandler = { [weak self] _ in
            DispatchQueue.main.async {
                self?.statusLabel.stringValue = "ローカルブリッジが停止しました"
                self?.detailLabel.stringValue = "JSLIFE Companionを再起動してください。"
            }
        }
        do {
            try process.run()
            bridgeProcess = process
        } catch {
            statusLabel.stringValue = "ブリッジを起動できません"
            detailLabel.stringValue = error.localizedDescription
        }
    }

    @objc private func startLogin() {
        guard loginProcess?.isRunning != true else { return }
        loginButton.isEnabled = false
        statusLabel.stringValue = "ブラウザでChatGPTに接続してください"
        detailLabel.stringValue = "認証が終わると、この画面へ接続状態が反映されます。"

        let process = Process()
        process.executableURL = codexURL
        process.arguments = ["login"]
        process.standardOutput = Pipe()
        process.standardError = Pipe()
        process.terminationHandler = { [weak self] _ in
            DispatchQueue.main.async {
                self?.loginButton.isEnabled = true
                self?.refreshLoginStatus()
            }
        }
        do {
            try process.run()
            loginProcess = process
        } catch {
            loginButton.isEnabled = true
            statusLabel.stringValue = "ChatGPTログインを開始できません"
            detailLabel.stringValue = error.localizedDescription
        }
    }

    @objc private func refreshStatusButton() {
        refreshLoginStatus()
    }

    private func refreshLoginStatus() {
        let process = Process()
        let output = Pipe()
        process.executableURL = codexURL
        process.arguments = ["login", "status"]
        process.standardOutput = output
        process.standardError = output
        process.terminationHandler = { [weak self] completed in
            let data = output.fileHandleForReading.readDataToEndOfFile()
            let text = String(data: data, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            DispatchQueue.main.async {
                guard let self else { return }
                if completed.terminationStatus == 0 {
                    self.statusLabel.stringValue = "ChatGPTで接続済み"
                    self.detailLabel.stringValue = "JSLIFEを開くと、AIチャットが自動的にこのCompanionへ接続します。"
                    self.loginButton.title = "再ログイン"
                } else {
                    self.statusLabel.stringValue = "ChatGPTへ未接続"
                    self.detailLabel.stringValue = text.isEmpty ? "「ChatGPTで接続」を押して認証してください。" : text
                    self.loginButton.title = "ChatGPTで接続"
                }
            }
        }
        do {
            try process.run()
        } catch {
            statusLabel.stringValue = "認証状態を確認できません"
            detailLabel.stringValue = error.localizedDescription
        }
    }

    @objc private func handleURL(event: NSAppleEventDescriptor, reply: NSAppleEventDescriptor) {
        guard
            let rawURL = event.paramDescriptor(forKeyword: keyDirectObject)?.stringValue,
            let components = URLComponents(string: rawURL),
            components.scheme == "jslife-companion",
            components.host == "pair",
            let returnValue = components.queryItems?.first(where: { $0.name == "return_url" })?.value,
            var returnComponents = URLComponents(string: returnValue),
            let scheme = returnComponents.scheme,
            let host = returnComponents.host,
            scheme == "https" || (scheme == "http" && (host == "localhost" || host == "127.0.0.1"))
        else { return }

        var queryItems = returnComponents.queryItems ?? []
        queryItems.removeAll(where: { $0.name == "companion_token" })
        queryItems.append(URLQueryItem(name: "companion_token", value: pairingToken))
        returnComponents.queryItems = queryItems
        guard let destination = returnComponents.url else { return }
        open(destination, in: components.queryItems?.first(where: { $0.name == "browser" })?.value)
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    private func open(_ destination: URL, in browser: String?) {
        let bundleIdentifier: String?
        switch browser {
        case "chrome": bundleIdentifier = "com.google.Chrome"
        case "edge": bundleIdentifier = "com.microsoft.edgemac"
        case "firefox": bundleIdentifier = "org.mozilla.firefox"
        case "safari": bundleIdentifier = "com.apple.Safari"
        default: bundleIdentifier = nil
        }

        guard
            let bundleIdentifier,
            let applicationURL = NSWorkspace.shared.urlForApplication(withBundleIdentifier: bundleIdentifier)
        else {
            NSWorkspace.shared.open(destination)
            return
        }

        let configuration = NSWorkspace.OpenConfiguration()
        configuration.activates = true
        NSWorkspace.shared.open(
            [destination],
            withApplicationAt: applicationURL,
            configuration: configuration
        ) { _, error in
            if error != nil {
                NSWorkspace.shared.open(destination)
            }
        }
    }
}
