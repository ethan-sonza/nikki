<script>
  import { currentPage } from "../stores.js";
  let links = ['Home', 'Videos', 'About']

  const setCurrentPage = (page) => {
    $currentPage = page
  }
</script>

<nav>
  <div class="brand">
    NIKKI
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
      font-family: Montserrat, sans-serif;
      font-weight: 600;
      font-size: 1.7em;
      margin-left: 1em;
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