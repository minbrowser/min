var searchParams = new URLSearchParams(window.location.search.replace('?', ''))

var h1 = document.getElementById('error-name')
var h2 = document.getElementById('error-desc')
var primaryButton = document.getElementById('primary-button')
var secondaryButton = document.getElementById('secondary-button')

var ec = searchParams.get('ec')
var url = searchParams.get('url')

function retry () {
  // make the page blank while the replacement page is loading, so it doesn't look like the error condition still exists
  document.body.innerHTML = ''
  document.body.style.backgroundColor = '#fff'

  window.location = url
}

var websiteNotFound = {
  name: l('serverNotFoundTitle'),
  message: l('serverNotFoundSubtitle'),
  secondaryAction: {
    title: l('archiveSearchAction'),
    url: 'https://web.archive.org/web/*/' + url
  },
  retryOnReconnect: true
}

var sslError = {
  name: l('sslErrorTitle'),
  message: l('sslErrorMessage')
}

var dnsError = {
  name: l('dnsErrorTitle'),
  messge: l('dnsErrorMessage')
}

var offlineError = {
  name: l('offlineErrorTitle'),
  message: l('offlineErrorMessage'),
  retryOnReconnect: true
}

// from https://source.chromium.org/chromium/chromium/src/+/master:net/base/net_error_list.h
const errorCodes = {
  '-1': 'IO_PENDING',
  '-2': 'FAILED',
  '-3': 'ABORTED',
  '-4': 'INVALID_ARGUMENT',
  '-5': 'INVALID_HANDLE',
  '-6': 'FILE_NOT_FOUND',
  '-7': 'TIMED_OUT',
  '-8': 'FILE_TOO_BIG',
  '-9': 'UNEXPECTED',
  '-10': 'ACCESS_DENIED',
  '-11': 'NOT_IMPLEMENTED',
  '-12': 'INSUFFICIENT_RESOURCES',
  '-13': 'OUT_OF_MEMORY',
  '-14': 'UPLOAD_FILE_CHANGED',
  '-15': 'SOCKET_NOT_CONNECTED',
  '-16': 'FILE_EXISTS',
  '-17': 'FILE_PATH_TOO_LONG',
  '-18': 'FILE_NO_SPACE',
  '-19': 'FILE_VIRUS_INFECTED',
  '-20': 'BLOCKED_BY_CLIENT',
  '-21': 'NETWORK_CHANGED',
  '-22': 'BLOCKED_BY_ADMINISTRATOR',
  '-23': 'SOCKET_IS_CONNECTED',
  '-24': 'BLOCKED_ENROLLMENT_CHECK_PENDING',
  '-25': 'UPLOAD_STREAM_REWIND_NOT_SUPPORTED',
  '-26': 'CONTEXT_SHUT_DOWN',
  '-27': 'BLOCKED_BY_RESPONSE',
  '-29': 'CLEARTEXT_NOT_PERMITTED',
  '-30': 'BLOCKED_BY_CSP',
  '-100': 'CONNECTION_CLOSED',
  '-101': 'CONNECTION_RESET',
  '-102': 'CONNECTION_REFUSED',
  '-103': 'CONNECTION_ABORTED',
  '-104': 'CONNECTION_FAILED',
  '-105': 'NAME_NOT_RESOLVED',
  '-106': 'INTERNET_DISCONNECTED',
  '-107': 'SSL_PROTOCOL_ERROR',
  '-108': 'ADDRESS_INVALID',
  '-109': 'ADDRESS_UNREACHABLE',
  '-110': 'SSL_CLIENT_AUTH_CERT_NEEDED',
  '-111': 'TUNNEL_CONNECTION_FAILED',
  '-112': 'NO_SSL_VERSIONS_ENABLED',
  '-113': 'SSL_VERSION_OR_CIPHER_MISMATCH',
  '-114': 'SSL_RENEGOTIATION_REQUESTED',
  '-115': 'PROXY_AUTH_UNSUPPORTED',
  '-116': 'CERT_ERROR_IN_SSL_RENEGOTIATION',
  '-117': 'BAD_SSL_CLIENT_AUTH_CERT',
  '-118': 'CONNECTION_TIMED_OUT',
  '-119': 'HOST_RESOLVER_QUEUE_TOO_LARGE',
  '-120': 'SOCKS_CONNECTION_FAILED',
  '-121': 'SOCKS_CONNECTION_HOST_UNREACHABLE',
  '-122': 'ALPN_NEGOTIATION_FAILED',
  '-123': 'SSL_NO_RENEGOTIATION',
  '-124': 'WINSOCK_UNEXPECTED_WRITTEN_BYTES',
  '-125': 'SSL_DECOMPRESSION_FAILURE_ALERT',
  '-126': 'SSL_BAD_RECORD_MAC_ALERT',
  '-127': 'PROXY_AUTH_REQUESTED',
  '-130': 'PROXY_CONNECTION_FAILED',
  '-131': 'MANDATORY_PROXY_CONFIGURATION_FAILED',
  '-133': 'PRECONNECT_MAX_SOCKET_LIMIT',
  '-134': 'SSL_CLIENT_AUTH_PRIVATE_KEY_ACCESS_DENIED',
  '-135': 'SSL_CLIENT_AUTH_CERT_NO_PRIVATE_KEY',
  '-136': 'PROXY_CERTIFICATE_INVALID',
  '-137': 'NAME_RESOLUTION_FAILED',
  '-138': 'NETWORK_ACCESS_DENIED',
  '-139': 'TEMPORARILY_THROTTLED',
  '-140': 'HTTPS_PROXY_TUNNEL_RESPONSE_REDIRECT',
  '-141': 'SSL_CLIENT_AUTH_SIGNATURE_FAILED',
  '-142': 'MSG_TOO_BIG',
  '-145': 'WS_PROTOCOL_ERROR',
  '-147': 'ADDRESS_IN_USE',
  '-148': 'SSL_HANDSHAKE_NOT_COMPLETED',
  '-149': 'SSL_BAD_PEER_PUBLIC_KEY',
  '-150': 'SSL_PINNED_KEY_NOT_IN_CERT_CHAIN',
  '-151': 'CLIENT_AUTH_CERT_TYPE_UNSUPPORTED',
  '-153': 'SSL_DECRYPT_ERROR_ALERT',
  '-154': 'WS_THROTTLE_QUEUE_TOO_LARGE',
  '-156': 'SSL_SERVER_CERT_CHANGED',
  '-159': 'SSL_UNRECOGNIZED_NAME_ALERT',
  '-160': 'SOCKET_SET_RECEIVE_BUFFER_SIZE_ERROR',
  '-161': 'SOCKET_SET_SEND_BUFFER_SIZE_ERROR',
  '-162': 'SOCKET_RECEIVE_BUFFER_SIZE_UNCHANGEABLE',
  '-163': 'SOCKET_SEND_BUFFER_SIZE_UNCHANGEABLE',
  '-164': 'SSL_CLIENT_AUTH_CERT_BAD_FORMAT',
  '-166': 'ICANN_NAME_COLLISION',
  '-167': 'SSL_SERVER_CERT_BAD_FORMAT',
  '-168': 'CT_STH_PARSING_FAILED',
  '-169': 'CT_STH_INCOMPLETE',
  '-170': 'UNABLE_TO_REUSE_CONNECTION_FOR_PROXY_AUTH',
  '-171': 'CT_CONSISTENCY_PROOF_PARSING_FAILED',
  '-172': 'SSL_OBSOLETE_CIPHER',
  '-173': 'WS_UPGRADE',
  '-174': 'READ_IF_READY_NOT_IMPLEMENTED',
  '-176': 'NO_BUFFER_SPACE',
  '-177': 'SSL_CLIENT_AUTH_NO_COMMON_ALGORITHMS',
  '-178': 'EARLY_DATA_REJECTED',
  '-179': 'WRONG_VERSION_ON_EARLY_DATA',
  '-181': 'SSL_KEY_USAGE_INCOMPATIBLE',
  '-200': 'CERT_COMMON_NAME_INVALID',
  '-201': 'CERT_DATE_INVALID',
  '-202': 'CERT_AUTHORITY_INVALID',
  '-203': 'CERT_CONTAINS_ERRORS',
  '-204': 'CERT_NO_REVOCATION_MECHANISM',
  '-205': 'CERT_UNABLE_TO_CHECK_REVOCATION',
  '-206': 'CERT_REVOKED',
  '-207': 'CERT_INVALID',
  '-208': 'CERT_WEAK_SIGNATURE_ALGORITHM',
  '-210': 'CERT_NON_UNIQUE_NAME',
  '-211': 'CERT_WEAK_KEY',
  '-212': 'CERT_NAME_CONSTRAINT_VIOLATION',
  '-213': 'CERT_VALIDITY_TOO_LONG',
  '-214': 'CERTIFICATE_TRANSPARENCY_REQUIRED',
  '-215': 'CERT_SYMANTEC_LEGACY',
  '-217': 'CERT_KNOWN_INTERCEPTION_BLOCKED',
  '-218': 'SSL_OBSOLETE_VERSION',
  '-219': 'CERT_END',
  '-300': 'INVALID_URL',
  '-301': 'DISALLOWED_URL_SCHEME',
  '-302': 'UNKNOWN_URL_SCHEME',
  '-303': 'INVALID_REDIRECT',
  '-310': 'TOO_MANY_REDIRECTS',
  '-311': 'UNSAFE_REDIRECT',
  '-312': 'UNSAFE_PORT',
  '-320': 'INVALID_RESPONSE',
  '-321': 'INVALID_CHUNKED_ENCODING',
  '-322': 'METHOD_NOT_SUPPORTED',
  '-323': 'UNEXPECTED_PROXY_AUTH',
  '-324': 'EMPTY_RESPONSE',
  '-325': 'RESPONSE_HEADERS_TOO_BIG',
  '-327': 'PAC_SCRIPT_FAILED',
  '-328': 'REQUEST_RANGE_NOT_SATISFIABLE',
  '-329': 'MALFORMED_IDENTITY',
  '-330': 'CONTENT_DECODING_FAILED',
  '-331': 'NETWORK_IO_SUSPENDED',
  '-332': 'SYN_REPLY_NOT_RECEIVED',
  '-333': 'ENCODING_CONVERSION_FAILED',
  '-334': 'UNRECOGNIZED_FTP_DIRECTORY_LISTING_FORMAT',
  '-335': 'INVALID_SPDY_STREAM',
  '-336': 'NO_SUPPORTED_PROXIES',
  '-338': 'INVALID_AUTH_CREDENTIALS',
  '-339': 'UNSUPPORTED_AUTH_SCHEME',
  '-340': 'ENCODING_DETECTION_FAILED',
  '-341': 'MISSING_AUTH_CREDENTIALS',
  '-342': 'UNEXPECTED_SECURITY_LIBRARY_STATUS',
  '-343': 'MISCONFIGURED_AUTH_ENVIRONMENT',
  '-344': 'UNDOCUMENTED_SECURITY_LIBRARY_STATUS',
  '-345': 'RESPONSE_BODY_TOO_BIG_TO_DRAIN',
  '-346': 'RESPONSE_HEADERS_MULTIPLE_CONTENT_LENGTH',
  '-348': 'PAC_NOT_IN_DHCP',
  '-349': 'RESPONSE_HEADERS_MULTIPLE_CONTENT_DISPOSITION',
  '-350': 'RESPONSE_HEADERS_MULTIPLE_LOCATION',
  '-353': 'PIPELINE_EVICTION',
  '-354': 'CONTENT_LENGTH_MISMATCH',
  '-355': 'INCOMPLETE_CHUNKED_ENCODING',
  '-356': 'QUIC_PROTOCOL_ERROR',
  '-357': 'RESPONSE_HEADERS_TRUNCATED',
  '-358': 'QUIC_HANDSHAKE_FAILED',
  '-359': 'REQUEST_FOR_SECURE_RESOURCE_OVER_INSECURE_QUIC',
  '-364': 'PROXY_AUTH_REQUESTED_WITH_NO_CONNECTION',
  '-367': 'PAC_SCRIPT_TERMINATED',
  '-369': 'TEMPORARY_BACKOFF',
  '-370': 'INVALID_HTTP_RESPONSE',
  '-371': 'CONTENT_DECODING_INIT_FAILED',
  '-375': 'TOO_MANY_RETRIES',
  '-379': 'HTTP_RESPONSE_CODE_FAILURE',
  '-380': 'QUIC_CERT_ROOT_NOT_KNOWN',
  '-381': 'QUIC_GOAWAY_REQUEST_CAN_BE_RETRIED',
  '-400': 'CACHE_MISS',
  '-401': 'CACHE_READ_FAILURE',
  '-402': 'CACHE_WRITE_FAILURE',
  '-403': 'CACHE_OPERATION_NOT_SUPPORTED',
  '-404': 'CACHE_OPEN_FAILURE',
  '-405': 'CACHE_CREATE_FAILURE',
  '-406': 'CACHE_RACE',
  '-407': 'CACHE_CHECKSUM_READ_FAILURE',
  '-408': 'CACHE_CHECKSUM_MISMATCH',
  '-409': 'CACHE_LOCK_TIMEOUT',
  '-410': 'CACHE_AUTH_FAILURE_AFTER_READ',
  '-411': 'CACHE_ENTRY_NOT_SUITABLE',
  '-412': 'CACHE_DOOM_FAILURE',
  '-413': 'CACHE_OPEN_OR_CREATE_FAILURE',
  '-501': 'INSECURE_RESPONSE',
  '-502': 'NO_PRIVATE_KEY_FOR_CERT',
  '-503': 'ADD_USER_CERT_FAILED',
  '-504': 'INVALID_SIGNED_EXCHANGE',
  '-505': 'INVALID_WEB_BUNDLE',
  '-506': 'TRUST_TOKEN_OPERATION_FAILED',
  '-507': 'TRUST_TOKEN_OPERATION_SUCCESS_WITHOUT_SENDING_REQUEST',
  '-601': 'FTP_FAILED',
  '-602': 'FTP_SERVICE_UNAVAILABLE',
  '-603': 'FTP_TRANSFER_ABORTED',
  '-604': 'FTP_FILE_BUSY',
  '-605': 'FTP_SYNTAX_ERROR',
  '-606': 'FTP_COMMAND_NOT_SUPPORTED',
  '-607': 'FTP_BAD_COMMAND_SEQUENCE',
  '-703': 'IMPORT_CA_CERT_NOT_CA',
  '-704': 'IMPORT_CERT_ALREADY_EXISTS',
  '-705': 'IMPORT_CA_CERT_FAILED',
  '-706': 'IMPORT_SERVER_CERT_FAILED',
  '-710': 'KEY_GENERATION_FAILED',
  '-712': 'PRIVATE_KEY_EXPORT_FAILED',
  '-713': 'SELF_SIGNED_CERT_GENERATION_FAILED',
  '-714': 'CERT_DATABASE_CHANGED',
  '-800': 'DNS_MALFORMED_RESPONSE',
  '-801': 'DNS_SERVER_REQUIRES_TCP',
  '-802': 'DNS_SERVER_FAILED',
  '-803': 'DNS_TIMED_OUT',
  '-804': 'DNS_CACHE_MISS',
  '-805': 'DNS_SEARCH_EMPTY',
  '-806': 'DNS_SORT_ERROR',
  '-808': 'DNS_SECURE_RESOLVER_HOSTNAME_RESOLUTION_FAILED'
}

// list: https://source.chromium.org/chromium/chromium/src/+/master:net/base/net_error_list.h
const erorDescriptions = {
  crash: {
    name: l('crashErrorTitle'),
    message: l('crashErrorSubtitle')
  },
  '-21': offlineError, // network changed
  '-104': {
    message: l('genericConnectionFail')
  },
  '-105': websiteNotFound,
  '-106': offlineError,
  '-107': sslError,
  '-109': websiteNotFound,
  '-110': sslError, // this is actually the error code for "server requested a client certificate", but we don't support that yet,
  '-112': sslError,
  '-113': sslError,
  '-116': sslError,
  '-117': sslError,
  '-200': sslError,
  '-201': {
    name: l('sslErrorTitle'),
    message: l('sslTimeErrorMessage')
  },
  '-202': sslError,
  '-203': sslError,
  '-204': sslError,
  '-205': sslError,
  '-206': sslError,
  '-207': sslError,
  '-208': sslError,
  '-210': sslError,
  '-211': sslError,
  '-212': sslError,
  '-213': sslError,
  '-300': {
    name: l('addressInvalidTitle')
  },
  '-501': sslError,
  '-800': dnsError,
  '-801': dnsError,
  '-802': dnsError,
  '-803': dnsError,
  '-804': dnsError,
  '-805': dnsError,
  '-806': dnsError
}

// show the error message and detail

var errDesc = erorDescriptions[ec]

if (errDesc && errDesc.retryOnReconnect) {
  window.addEventListener('online', function () {
    retry()
  })
}

var title, subtitle

if (errDesc) {
  title = errDesc.name || ''
  subtitle = errDesc.message || ''
} else {
  title = l('genericError')
  subtitle = (errorCodes[ec] || '') + ' (' + ec + ')'
}

h1.textContent = title
h2.textContent = subtitle
document.title = title

if (errDesc && errDesc.secondaryAction) {
  secondaryButton.hidden = false
  secondaryButton.textContent = errDesc.secondaryAction.title
  secondaryButton.addEventListener('click', function () {
    window.location = errDesc.secondaryAction.url
  })
}

// if an ssl error occured, "try again" should go to the http:// version, which might work

if (erorDescriptions[ec] === sslError) {
  url = url.replace('https://', 'http://')
}

if (url) {
  primaryButton.addEventListener('click', function () {
    retry()
  })
}

primaryButton.focus()
