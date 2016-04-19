var fs = require('fs');
var hosts = [];

var HOSTS_FILE = process.platform === 'win32'
    ? 'C:/Windows/System32/drivers/etc/hosts'
    : '/etc/hosts';

fs.readFile(HOSTS_FILE, 'utf8', parseHosts);

function parseHosts(err, data) {
    if (err) {
        return;
    }

    data = data.replace(/(\s|#.*|255\.255\.255\.255|broadcasthost)+/g, ' ').split(' ');

    data.forEach(function(host) {
        if (host.length > 0 && hosts.indexOf(host) === -1) {
            hosts.push(host);
        }
    });
}

function showHostsSuggestions(text, input, event, container) {

    empty(container);

    var results = hosts.filter(function (host) {
        // only match start of host string
        return host.indexOf(text) === 0;
    });

    results.slice(0, 4).forEach(function (result) {

        var item = createSearchbarItem({
            title: result,
            secondaryText: 'Hosts file entry',
            url: 'http://'+result
        });

        container.appendChild(item);

    })

}

registerSearchbarPlugin("hostsSuggestions", {
    index: 1,
    trigger: function (text) {
        return (typeof text === 'string' && text.length > 2 );
    },
    showResults: showHostsSuggestions,
});
