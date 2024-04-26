var favButton = document.getElementById('favorite-button')

function initialize () {
  favButton.addEventListener('click', function (e) {
    favButton.classList.toggle('carbon:favorite-filled')
  })
}
module.exports = { initialize }
