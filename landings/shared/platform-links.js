/**
 * Static landings (appex.kz, appex.kz/tech-orda) use this to link into the React app.
 * Set APP_PLATFORM_BASE before this script (full origin, no trailing slash), e.g. https://app.appex.kz
 */
;(function () {
  function base() {
    var b =
      window.APP_PLATFORM_BASE ||
      window.APPEX_APP_ORIGIN ||
      ''
    if (typeof b === 'string' && b.length) return b.replace(/\/$/, '')
    return ''
  }

  window.appexApp = {
    /**
     * @param {string} path Absolute path on the SPA (must start with /)
     */
    url: function (path) {
      var p =
        path && String(path).charAt(0) === '/' ? path : '/' + (path || '')
      var bb = base()
      return bb ? bb + p : p
    },

    /**
     * @param {string} [nextPath] e.g. /skills — passed as ?next= for post-login redirect
     * @param {string} [email] optional prefill for the signup form (?email=)
     */
    hrefRegister: function (nextPath, email) {
      var q = '?tab=signup'
      if (nextPath) q += '&next=' + encodeURIComponent(nextPath)
      if (email) q += '&email=' + encodeURIComponent(email)
      return this.url('/auth' + q)
    },

    /**
     * @param {string} [nextPath] internal path after login
     */
    hrefLogin: function (nextPath) {
      var q = '?tab=signin'
      if (nextPath) q += '&next=' + encodeURIComponent(nextPath)
      return this.url('/auth' + q)
    },

    hrefHome: function () {
      return this.url('/home')
    },

    hrefSkills: function () {
      return this.url('/skills')
    },
  }

  /**
   * Wires anchors: data-appex-link="register|login|app" data-appex-next="/skills" data-appex-path="/home"
   */
  function bindDataLinks() {
    if (!window.appexApp) return
    document.querySelectorAll('[data-appex-link]').forEach(function (el) {
      var kind = el.getAttribute('data-appex-link')
      var next = el.getAttribute('data-appex-next') || ''
      if (kind === 'register') {
        var em = el.getAttribute('data-appex-email')
        el.setAttribute('href', window.appexApp.hrefRegister(next, em || undefined))
      }
      else if (kind === 'login')
        el.setAttribute('href', window.appexApp.hrefLogin(next))
      else if (kind === 'app') {
        var path = el.getAttribute('data-appex-path') || '/home'
        el.setAttribute('href', window.appexApp.url(path))
      }
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindDataLinks)
  } else {
    bindDataLinks()
  }
})()
