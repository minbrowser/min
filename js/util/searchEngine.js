var currentSearchEngine = {
  name: '',
  searchURL: '%s'
}

var defaultSearchEngine = 'DuckDuckGo'

var searchEngines = {
  DuckDuckGo: {
    name: 'DuckDuckGo',
    searchURL: 'https://duckduckgo.com/?q=%s&t=min'
  },
  Google: {
    name: 'Google',
    searchURL: 'https://google.com/search?q=%s'
  },
  Bing: {
    name: 'Bing',
    searchURL: 'https://www.bing.com/search?q=%s'
  },
  Yahoo: {
    name: 'Yahoo',
    searchURL: 'https://search.yahoo.com/yhs/search?p=%s'
  },
  Baidu: {
    name: 'Baidu',
    searchURL: 'https://www.baidu.com/s?wd=%s'
  },
  StartPage: {
    name: 'StartPage',
    searchURL: 'https://startpage.com/do/search?q=%s'
  },
  Wikipedia: {
    name: 'Wikipedia',
    searchURL: 'https://wikipedia.org/w/index.php?search=%s'
  },
  Yandex: {
    name: 'Yandex',
    searchURL: 'https://yandex.com/search/?text=%s'
  },
  none: {
    name: 'none',
    searchURL: 'http://%s'
  }
}

settings.get('searchEngine', function (value) {
  if (value) {
    currentSearchEngine = searchEngines[value]
  } else {
    currentSearchEngine = searchEngines[defaultSearchEngine]
  }
})
