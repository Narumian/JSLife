import AppKit
import Foundation
import WebKit

@main
enum JSLifeApplication {
    static func main() {
        let application = NSApplication.shared
        let delegate = AppDelegate()
        application.setActivationPolicy(.regular)
        application.delegate = delegate
        application.run()
    }
}

final class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate {
    private var window: NSWindow!
    private var webView: WKWebView!
    private var bridgeProcess: Process?
    private var loginProcess: Process?
    private var navigationAttempts = 0

    private var resourcesURL: URL { Bundle.main.resourceURL! }
    private var nodeURL: URL { resourcesURL.appendingPathComponent("runtime/bin/node") }
    private var codexURL: URL { resourcesURL.appendingPathComponent("runtime/bin/codex") }
    private var serverURL: URL { resourcesURL.appendingPathComponent("server/codex-bridge.mjs") }
    private var uiURL: URL { resourcesURL.appendingPathComponent("ui") }

    private var pairingToken: String {
        if let existing = UserDefaults.standard.string(forKey: "pairingToken"), !existing.isEmpty {
            return existing
        }
        let token = UUID().uuidString.replacingOccurrences(of: "-", with: "").lowercased()
        UserDefaults.standard.set(token, forKey: "pairingToken")
        return token
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        buildMenu()
        buildWindow()
        startBridge()
        loadApplication()
        showWindow()
    }

    func applicationWillTerminate(_ notification: Notification) {
        bridgeProcess?.terminate()
        loginProcess?.terminate()
    }

    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        showWindow()
        return true
    }

    private func buildMenu() {
        let mainMenu = NSMenu()
        let applicationItem = NSMenuItem()
        mainMenu.addItem(applicationItem)
        let applicationMenu = NSMenu()
        applicationMenu.addItem(withTitle: "About JSLIFE", action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)), keyEquivalent: "")
        applicationMenu.addItem(.separator())
        applicationMenu.addItem(withTitle: "Quit JSLIFE", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        applicationItem.submenu = applicationMenu

        let accountItem = NSMenuItem()
        mainMenu.addItem(accountItem)
        let accountMenu = NSMenu(title: "Codex")
        let loginItem = accountMenu.addItem(withTitle: "ChatGPTでログイン", action: #selector(startLogin), keyEquivalent: "l")
        loginItem.target = self
        let reloadItem = accountMenu.addItem(withTitle: "JSLIFEを再読み込み", action: #selector(reloadApplication), keyEquivalent: "r")
        reloadItem.target = self
        accountItem.submenu = accountMenu
        NSApp.mainMenu = mainMenu
    }

    private func buildWindow() {
        window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 1380, height: 860),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.center()
        window.title = "JSLIFE"
        window.minSize = NSSize(width: 900, height: 620)
        window.isReleasedWhenClosed = false

        guard let content = window.contentView else { return }
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        webView = WKWebView(frame: content.bounds, configuration: configuration)
        webView.navigationDelegate = self
        webView.autoresizingMask = [.width, .height]
        content.addSubview(webView)
    }

    private func showWindow() {
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
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
        environment["JSLIFE_UI_ROOT"] = uiURL.path
        process.environment = environment
        process.standardOutput = Pipe()
        process.standardError = Pipe()
        process.terminationHandler = { [weak self] _ in
            DispatchQueue.main.async {
                self?.showBridgeFailure()
            }
        }
        do {
            try process.run()
            bridgeProcess = process
        } catch {
            showBridgeFailure(error.localizedDescription)
        }
    }

    private func loadApplication() {
        window.title = "JSLIFE — Loading"
        var components = URLComponents(string: "http://127.0.0.1:4317/")!
        components.queryItems = [URLQueryItem(name: "companion_token", value: pairingToken)]
        webView.load(URLRequest(url: components.url!))
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        navigationAttempts = 0
        window.title = "JSLIFE"
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) { [weak self] in
            self?.webView.evaluateJavaScript("document.getElementById('root')?.childElementCount || 0") { value, error in
                DispatchQueue.main.async {
                    guard let self else { return }
                    if let error {
                        self.window.title = "JSLIFE — UI Check Failed"
                        self.showBridgeFailure(error.localizedDescription)
                    } else if (value as? Int ?? 0) == 0 {
                        self.window.title = "JSLIFE — UI Did Not Render"
                    }
                }
            }
        }
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        guard bridgeProcess?.isRunning == true, navigationAttempts < 40 else {
            window.title = "JSLIFE — Could Not Start"
            showBridgeFailure(error.localizedDescription)
            return
        }
        navigationAttempts += 1
        window.title = "JSLIFE — Starting Local Service"
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) { [weak self] in self?.loadApplication() }
    }

    private func showBridgeFailure(_ detail: String = "JSLIFEを終了して、もう一度起動してください。") {
        guard webView != nil else { return }
        let escaped = detail.replacingOccurrences(of: "&", with: "&amp;").replacingOccurrences(of: "<", with: "&lt;")
        webView.loadHTMLString("""
        <body style="margin:0;background:#090c0e;color:#f2f4ed;font:14px -apple-system;display:grid;place-items:center;height:100vh">
          <div style="max-width:520px;text-align:center"><h1 style="color:#c8ff45">JSLIFE</h1><p>\(escaped)</p></div>
        </body>
        """, baseURL: nil)
    }

    @objc private func reloadApplication() {
        startBridge()
        navigationAttempts = 0
        loadApplication()
    }

    @objc private func startLogin() {
        guard loginProcess?.isRunning != true else { return }
        let process = Process()
        process.executableURL = codexURL
        process.arguments = ["login"]
        process.standardOutput = Pipe()
        process.standardError = Pipe()
        process.terminationHandler = { [weak self] _ in
            DispatchQueue.main.async { self?.loadApplication() }
        }
        do {
            try process.run()
            loginProcess = process
        } catch {
            showBridgeFailure(error.localizedDescription)
        }
    }
}
