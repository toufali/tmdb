import { movieService } from '../services/movie.service.js'
import { dateInRange, arraysHaveMatch } from '../utils.js'

const template = /*html*/ `
<style>
  *{
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  :host{
    display: block;
    contain: layout;
    transition: transform .4s cubic-bezier(.4,0,.25,1);
    will-change: transform;
    background-color: hsl(0deg 0% 10%);
  }

  :host([hidden]) {
    transition-duration: .3s;
    transform: translateX(-100%);
  }

  @supports (backdrop-filter: blur(12px)) or (-webkit-backdrop-filter: blur(12px)) {
    :host{
      -webkit-backdrop-filter: blur(12px);
      backdrop-filter: blur(12px);
      background-color: hsl(0deg 0% 10% / 75%);
    }
  }

  form{
    display: grid;
    align-items: center;
    align-content: safe center;
    grid-template-columns: 1fr 1fr;
    grid-auto-rows: 36px;
    gap: var(--space-md);
    padding: var(--space-lg);
    height: 100vh;
    text-align: right;
    overflow-y: auto;
    border-right: 1px solid #333;
  }

  form::after{
    content: '';
    height: 100%;
  }

  fieldset{
    display: contents;
  }

  legend{
    grid-column: span 2;
    height: 100%;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    text-align: center;
    color: var(--tan);
    border-bottom: 6px solid var(--dark-gray);
  }

  button,
  input,
  label{
    height: 100%;
    border: 2px solid var(--dark-gray);
    border-radius: var(--border-radius);
    font-family: var(--primary-font);
    font-size: 1rem;
    color: white;
    background-color: transparent;
    outline: none;
    overflow: hidden;
  }

  button,
  label{
    cursor: pointer;
  }

  input[type="search"]{
    grid-column: span 2;
    padding: 0 var(--space-md);
  }

  input[type="date"]{
    padding: 0 var(--space-sm);
  }

  input[type="checkbox"]{
    display: none;
  }

  input[type="checkbox"] + span{
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    pointer-events: none;
    transition: background-color .2s ease-out;
  }

  input[type="checkbox"]:checked + span{
    background-color: rgba(255,255,255,.2);
  }

  button[type="submit"]{
    grid-column: span 2;
    background-color: var(--orange);
    border: none;
    text-shadow: 0 0 2px black;
  }

  button[type="submit"]:active{
    filter: brightness(1.25);
  }

  .panel-toggle-btn{
    position: absolute;
    top: 160px;
    left: 100%;
    width: 36px;
    height: auto;
    padding: var(--space-lg) 0;
    color: var(--tan);
    background-color: var(--dark-gray);
    border: none;
    border-radius: 0 var(--border-radius) var(--border-radius) 0;
    box-shadow: inset 5px 0 5px -4px #111, inset 0 0 0 2px hsl(0deg 0% 100% / 10%);
  }

  .panel-toggle-btn span{
    writing-mode: vertical-rl;
    text-orientation: mixed;
    pointer-events: none;
  }

  ::-webkit-search-cancel-button{
    filter: brightness(3) grayscale(1);
    cursor: pointer;
  }

  ::-webkit-calendar-picker-indicator {
    filter: invert(1);
    cursor: pointer;
  }
</style>

<form>
  <fieldset>
    <legend>SEARCH MOVIES</legend>
    <input name="title" type="search" autocomplete="off" required autofocus>
  </fieldset>

  <fieldset>
    <legend>FILTER BY RELEASE DATE</legend>
    After:<input name="date" type="date" placeholder="yyyy-mm-dd" value="1900-01-01">
    Before:<input name="date" type="date" placeholder="yyyy-mm-dd" value="${new Date().toISOString().split('T')[0]}">
  </fieldset>

  <fieldset name="genres">
    <legend>FILTER BY GENRE</legend>
  </fieldset>

  <fieldset>
    <legend></legend>
    <button name="submit" type="submit">SEARCH</button>
  </fieldset>
</form>
<button class="panel-toggle-btn" name="panel-toggle" type="button"><span>FILTER<span></button>
`

class FilterPanel extends HTMLElement {
  constructor() {
    super()

    this.attachShadow({ mode: 'open' })
    this.shadowRoot.innerHTML = template
    this.form = this.shadowRoot.querySelector('form')
    this.genreFieldset = this.shadowRoot.querySelector('[name="genres"]')

    this.initGenres()
    this.addEventListener('click', this)
  }

  async initGenres() {
    let html = ''

    this.genreMap = await movieService.getGenreMap()
    this.genreMap.forEach((name, id) => {
      html += /*html*/ `
      <label>
        <input name="genre" type="checkbox" value="${id}">
        <span>${name}</span>
      </label>
      `
    })
    this.genreFieldset.insertAdjacentHTML('beforeend', html)
  }

  async handleEvent(e) {
    const target = e.composedPath()[0]

    switch (target.name) {
      case 'panel-toggle':
        this.toggleAttribute('hidden')
        this.form.elements['title'].focus()
        break
      case 'submit':
        this.handleSubmit(e)
        break
    }
  }

  async handleSubmit(e) {
    // TODO: Add validation
    e.preventDefault()

    const formData = new FormData(this.form)
    const title = formData.get('title')
    const genres = formData.getAll('genre').map(str => parseInt(str))
    const dates = formData.getAll('date')

    // TMDB API doesn't allow combined query with filters
    // if query provided, fetch by title and filter genre/dates from results on client-side
    // if no query provided, fetch by genre/dates
    if (title) {
      this.movies = await movieService.searchByTitle(title)
      if (dates.some(date => date)) this.movies = this.filterByDate(this.movies, dates)
      if (genres.length) this.movies = this.filterByGenre(this.movies, genres)
    } else {
      this.movies = await movieService.searchByFilters(genres, dates)
    }

    this.setAttribute('hidden', '')
    this.dispatchEvent(
      new CustomEvent('filter-update', {
        detail: this.movies
      })
    )
  }

  filterByDate(movies, dates) {
    return movies.filter(movie => dateInRange(movie.release_date, dates))
  }

  filterByGenre(movies, genres) {
    return movies.filter(movie => arraysHaveMatch(movie.genre_ids, genres))
  }

  disconnectedCallbback() {
    this.removeEventListener('click', this)
  }
}

customElements.define('filter-panel', FilterPanel)
