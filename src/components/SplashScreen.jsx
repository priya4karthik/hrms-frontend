export default function SplashScreen() {
  return (
    <div className="splash-screen">
      <div className="splash-logo">
        <div className="splash-logo-icon">🏢</div>
        <div className="splash-logo-text">
          <h1>HRMS</h1>
          <span>Human Resource Management</span>
        </div>
      </div>
      <p className="splash-tagline">Streamline your workforce, amplify your potential</p>
      <div className="splash-loader">
        <div className="splash-bar">
          <div className="splash-bar-fill" />
        </div>
        <div className="splash-dots">
          <span /><span /><span />
        </div>
      </div>
    </div>
  )
}
