var hosts = [];
require('hostile').get(false, function (err, lines) {
    if (!err) {
        lines.forEach(function (line) {
            line.forEach(function (host) {
                host = host.split(' ');
                host.forEach(function (host) {
                    if (hosts.indexOf(host) === -1) {
                        hosts.push(host);
                    }
                });
            })
        });
    }
});

function showHostsSuggestions(text, input, event, container) {

    empty(container);

    var results = hosts.filter(function (host) {
        return host.indexOf(text) > -1;
    });

    results.slice(0, 4).forEach(function (result) {

        var item = createSearchbarItem({
            title: result,
            secondaryText: 'via hosts file',
            url: 'http://'+result
        });

        container.appendChild(item);

    })

}

registerSearchbarPlugin("hostsSuggestions", {
    index: 1,
    trigger: function (text) {
        return !!text;
    },
    showResults: showHostsSuggestions,
});
