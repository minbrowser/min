
var browserUI = require('browserUI.js')
var favbar = document.getElementById('favorites-bar')
const defaultFavorites = [
  {
    title: 'Google',
    url: 'https://www.google.com'
  },
  {
    title: 'GitHub',
    url: 'https://github.com'
  }
]
function createFavoriteElement (favorite) {
  const favoriteLink = document.createElement('a')
  favoriteLink.textContent = favorite.title
  favoriteLink.classList.add('favorite-item')

  favoriteLink.addEventListener('click', () => {
    browserUI.openURLInNewTab(favorite.url)
  })

  return favoriteLink
}
// Fonction pour initialiser la barre de favoris
function initialize () {
  defaultFavorites.forEach(favorite => {
    const favoriteElement = createFavoriteElement(favorite)
    favbar.appendChild(favoriteElement)
  })
}

// Initialiser la barre de favoris au chargement de la page
document.addEventListener('DOMContentLoaded', initialize)
module.exports = { initialize }
