<script>
  import { YouTubePreview } from '../components';
  let videos = [
    {
      id: 'cQIaYLXR2BA',
      category: 'Promotional',
    }, {
      id: 'Rh5tEDUxric',
      category: 'Educational',
    }, {
      id: '47c5PGlduA8',
      category: 'Entertainment',
    }, {
      id: '2_U3J70OsDQ',
      category: 'Promotional',
    }, {
      id: 'ei8vJa4c-RA',
      category: 'Educational',
    }, {
      id: 'GJfnS7sLfJk',
      category: 'Entertainment',
    }
  ]

  let categories = ['Promotional', 'Educational', 'Entertainment'];
  let filter = "";

  const setFilter = (q) => {
    if(filter == q) {
      filter = ""
    } else {
      filter = q
    }
  }
	$: filteredList = videos.filter(video => video.category.indexOf(filter) !== -1);
</script>

<div class="page">
  <div class="title text m">
    VIDEOS

    <div class="filters">
      {#each categories as category}
        <div class="filter"
          class:active={filter == category}
          on:click={() => setFilter(category)}
        >
          {category}
        </div>
      {/each}
    </div>
  </div>

  <div class="videos">
    {#each filteredList as { id, category }}
      <YouTubePreview category={category} bind:videoId={id} tileWidth="25%" tileStyles="margin: 1.5em;"/>
    {/each}
  </div>
</div>

<style>
  .title {
    flex-flow: column wrap;
  }
  .videos {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
  }
  .filters {
    display: flex;
    font-size: 0.3em;
    justify-content: center;
  }
  .filter:not(:first-child) {
    margin-left: 1em;
  }
  .filter.active {
    font-weight: bold;
    text-decoration: underline;
  }
</style>