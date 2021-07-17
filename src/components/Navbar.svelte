<script>
  import { currentPage } from "../stores.js";
  let links = ['Home', 'Videos', 'About']

  const setCurrentPage = (page) => {
    $currentPage = page
  }
</script>

<nav>
  <div class="brand m"
    on:click={() => setCurrentPage('Home')}
  >
    NC
  </div>

  <div class="links">
    {#each links as link}
      <div class="link"
        class:active={$currentPage == link}
        on:click={() => setCurrentPage(link)}
      >
        {link}
      </div>
    {/each}
  </div>
</nav>

<style>
    nav {
      position: fixed;
      width: inherit;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #efefef;
      z-index: 999;
    }
    nav div {
      padding: 10px;
      margin-top: 5px;
    }

    .brand {
      font-weight: 700;
      font-size: 1.7em;
      margin-left: 1em;
      cursor: pointer;
    }

    .links {
      display: flex;
      margin-right: 1em;
    }

    .link {
      cursor: pointer;
    }
    .link.active {
      font-weight: bold;
      text-decoration: underline;
    }
</style>