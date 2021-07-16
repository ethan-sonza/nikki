<script>
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { Section, YouTubePreview, FullVid } from '../components';

  import { Icon } from '../helpers'

  let visible = false;
  let videos = [
    {
      id: 'cQIaYLXR2BA',
    }, {
      id: 'Rh5tEDUxric',
    }, {
      id: '47c5PGlduA8',
    },
  ]

  onMount(async () => {
    visible = true
  });
</script>

  <!-- <Parallax sections={2.2}> -->
  <!-- <ParallaxLayer offset={0} rate={.5}> -->
  <!-- <Section colour='#212121' height='95'>
    {#if visible}
    <div class="me text r"
      in:fade="{{duration: 1000}}"
    >
      <div class="half left">
        <div class="name">NIKKI <br> CADIZ</div>
      </div>

      <div class="half right">
        <div class="job">VIDEO <br> EDITOR</div>
      </div>
    </div>
  {/if}
  </Section> -->
  <!-- <Section colour='#212121' height='100'>
    <FullVid></FullVid>
  </Section> -->

  <Section colour='#EFEFEF' height='90'>
    <div class="bio itext">
      <div class="intro">I edit...</div>
      <div class="categories">
        <div>
          <Icon name='testimony' />
          TESTIMONIES
        </div>
        <div>
          <Icon name='webclass' />
          WEBCLASSES
        </div>
        <div>
          <Icon name='advert' />
          
          ADVERTISEMENTS
        </div>
        <div>
          
          <Icon name='music' />
          MUSIC VIDEOS
        </div>
      </div>
      <!-- I am NIKKI CADIZ, a freelance video editor based in the Philippines.
      I create videos ranging from testimonials, advertisements, web classes, and social media content.
      I am available for both short-term and long-term projects. -->
    </div>
  </Section>

  <Section colour='#212121' height='48'>
    <div class="headers">
      <div class="m">PROMOTIONAL</div>
      <div class="m">EDUCATIONAL</div>
      <div class="m">ENTERTAINMENT</div>
    </div>
    <div class="videos">
      {#each videos as { id, category }}
        <YouTubePreview videoId={id} category={category} border />
      {/each}
    </div>
  </Section>

  <Section colour='#212121' height='75'>
    <div class="contact text m">
      <div class="work o">LET'S WORK TOGETHER</div>
      <div class="email">nikkitries@gmail.com</div>
    </div>
  </Section>
<style>
  .me {
    font-weight: 700;
    font-size: 7.5em;
  }
  .half {
    height: inherit;
    width: 50%;
    display: flex;
    align-items: center;
    line-height: 1;
  }
  .half.left {
    justify-content: flex-end;
    color: var(--black);
    background-color: var(--white);
    padding-right: 0.2em;
    text-align: right;
    font-weight: 800;
  }
  .half.right {
    justify-content: flex-start;
    color: var(--white);
    background-color: var(--black);
    padding-left: 0.2em;
    text-align: left;
    font-weight: 700;
  }

  .bio {
    font-size: 3em;
    text-align: center;
    padding: 0 2em;
    flex-flow: column;
  }
  .bio .categories {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    width: 100%;
  }
  .bio .categories div {
    width: 50%;
  }

  .videos, .headers {
    width: 100%;
    display: flex;
    justify-content: space-evenly;
  }
  .headers div {
    width: 33.33%;
    text-align: center;
    color: var(--white);
    font-size: 4em;
    border: 2px solid var(--white);
  }

  .contact {
    flex-flow: column wrap;
    font-size: 4em;
  }

  .contact .work {
    font-style: italic;
    font-size: 1.2em;
    margin-bottom: 0.3em;
  }
</style>