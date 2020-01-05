
var releaseCount = 2
try {
  var n = Math.max(1, parseInt(new URLSearchParams(window.location.search).get('n')))
  if (n !== 0 && !Number.isNaN(n)) {
    releaseCount = n
  }
} catch (e) {}

window.addEventListener('DOMContentLoaded', function (event) {
  fetch('https://api.github.com/repos/minbrowser/min/releases').then(response => response.json())
   .then(function (releases) {
     var container = document.getElementById('releases')
     releases
     .slice(0, releaseCount)
     .forEach(function (release, index) {
       // display release info
       var relContainer = document.createElement('div')
       relContainer.className = 'release-container'

       var heading = document.createElement('h1')
       heading.textContent = release.name
       relContainer.appendChild(heading)

       if (index === 0) {
           // only show download button for latest release
         var downloadLink = document.createElement('a')
         var button = document.createElement('button')
         button.className = 'button outlined-button outlined-button-white'
         var buttonLabel = document.createElement('span')
         buttonLabel.className = 'button-label'
         buttonLabel.textContent = 'Download'
         button.appendChild(buttonLabel)
         downloadLink.appendChild(button)

         setupDownloadButton(button)
         relContainer.appendChild(downloadLink)

         var spacer = document.createElement('div')
         spacer.className = 'release-spacer'
         relContainer.appendChild(spacer)
       }

       var notes = document.createElement('div')
       notes.className = 'release-notes'
       notes.innerHTML = new markdownit({html: true}).render(release.body)
       relContainer.appendChild(notes)

       container.appendChild(relContainer)
     })
   })
})
