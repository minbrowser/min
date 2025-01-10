const providers = {
    appfolio: (uid) => `https://${uid}.appfolio.com/users/sign_in`,
    propertyware: (uid) => `https://app.propertyware.com/pw/login.jsp`,
    buildium: (uid) =>
      `https://${uid}.managebuilding.com/manager/public/authentication/login`,
    rentvine: (uid) => `https://account.rentvine.com/auth/login`,
  };
  
  const homeUrls = {
    appfolio: (uid) => `https://${uid}.appfolio.com`,
    propertyware: (uid) => `https://app.propertyware.com`,
    buildium: (uid) => `https://${uid}.managebuilding.com`,
    rentvine: (uid) => `https://account.rentvine.com`,
  };
  
  const providerName = {
    RV: "rentvine",
    AF: "appfolio",
    BD: "buildium",
    PW: "propertyware",
  };
  
  const urls = {
    PW_LOGIN_API: "https://app.propertyware.com/pw/login.do",
    PW_HOME: "https://app.propertyware.com/pw/home/home.do",
    APM_2FA: "https://tech.apmhelp.com/two_factor/verification_code.json",
    RV_ACCOUNT: "https://account.rentvine.com",
    PROD_LOGIN_URL: "https://pms-accounts.vercel.app",
    STAGING_LOGIN_URL: "https://pms-accounts-git-staging-apm-help.vercel.app",
  };
  
  const envEnum = {
    PROD: "production",
  };
  
  const config = {
    LOGOUT_EXPIRY: 1, // In days
    MILLISSECONDS_IN_A_DAY: 86400000,
  };
  
  const appfolioUrls = {
    SUB_DOMAIN: '.appfolio.com',
    RECONCILIATION_PAGE: "/bank_statements/current/edit",
    RECONCILIATION_SUCCESS:
      "/bank_statements/current/edit?status=reconcile_success",
    INCOME_STATEMENT: "/buffered_reports/income_statement?customize=true",
    WORK_ORDER_PATTERN: /^https:\/\/[a-zA-Z0-9]+\.appfolio\.com\/maintenance\/service_requests\/\d+\/work_orders\/\d+/,
    WORK_ORDER_SCHEDULE_PATTERN: /^https:\/\/([a-zA-Z0-9]+)\.appfolio\.com\/maintenance\/service_requests\/(\d+)\/work_orders\/(\d+)\/schedule/,
  };
  
  const propertywareUrls = {
    BASE: "https://app.propertyware.com",
    CONTACT_DETAIL: "/pw/contacts/contact_detail.do",
    LOGIN_AS_SUCCESS:
      "https://app.propertyware.com/pw/index.html#/ownerportal/mydashboard",
  };
  
  const pmsUrlPatterns = [
    /^https:\/\/([a-zA-Z0-9-]+)\.appfolio\.com(\/.*)?$/, 
    /^https:\/\/([a-zA-Z0-9-]+)\.managebuilding\.com(\/.*)?$/, 
    /^https:\/\/([a-zA-Z0-9-]+)\.rentvine\.com(\/.*)?$/
  ]
  
  module.exports = {
    providers,
    providerName,
    urls,
    homeUrls,
    envEnum,
    config,
    appfolioUrls,
    propertywareUrls,
    pmsUrlPatterns
  };
  