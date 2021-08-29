<script>
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { Section, FullVid } from '../components';
  import { currentPage } from "../stores.js";
  import { Icon, breakpoint } from '../helpers'

  let visible = false;
  const setCurrentPage = (page) => $currentPage = page
  onMount(async () => {
    visible = true
  });
</script>

<div>
  <!-- <Parallax sections={2.2}> -->
  <!-- <ParallaxLayer offset={0} rate={.5}> -->
  <Section colour='#212121' height='{$breakpoint === 'xs' ? 25 : 95}'>
    {#if visible}
      <div class="me text r" in:fade="{{duration: 1000}}">
        <div class="half left">
          <div class="name">NIKKI <br> CADIZ</div>
        </div>

        <div class="half right">
          <div class="job">VIDEO <br> EDITOR</div>
        </div>
      </div>
    {/if}
  </Section>
  <Section colour='#212121' height='{$breakpoint === 'xs' ? 25 : 100}'>
    <FullVid></FullVid>
  </Section>

  <Section colour='#F67280' height='{$breakpoint === 'xs' ? 18 : 65}'>
    <div class="bio text f-yellow">
      I am NIKKI CADIZ, a freelance video editor based in the Philippines. I am available for both short-term and long-term projects.
    </div>
  </Section>

  <Section colour='#C06C84' height='{$breakpoint === 'xs' ? 18 : 65}'>
    <div class="can-do text f-blue">
      <div class="intro">I edit...</div>
      <div class="categories">
        <div>
          <Icon name='testimony' fill='#355C7D' />
          <span>TESTIMONIALS</span>
        </div>
        <div>
          <Icon name='advert' fill='#355C7D' />
          <span>ADVERTISEMENTS</span>
        </div>
        <div>
          <Icon name='music' fill='#355C7D' />
          <span>MUSIC VIDEOS</span>
        </div>
        <div>
          <Icon name='webclass' fill='#355C7D' />
          <span>WEBCLASSES</span>
        </div>
      </div>
      <div class="intro">... and more!</div>
      <button on:click={() => setCurrentPage('Videos')}>VIEW PORTFOLIO</button>
    </div>
  </Section>

  <Section colour='#6C5B7B' height='{$breakpoint === 'xs' ? 18 : 75}'>
    <div class="contact text f-yellow">
      <div class="work c">LET'S WORK TOGETHER!</div>
      <div class="email r">nikkitries@gmail.com</div>
    </div>
  </Section>
</div>

<style lang="scss">
  .me {
    font-weight: 700;
    font-size: 6.5vw;
  }
  .half {
    height: inherit;
    width: 50%;
    display: flex;
    align-items: center;
    line-height: 1;

    &.left {
      justify-content: flex-end;
      color: var(--blue);
      background-color: var(--yellow);
      padding-right: 0.2em;
      text-align: right;
      font-weight: 800;
    }

    &.right {
      justify-content: flex-start;
      color: var(--yellow);
      background-color: var(--blue);
      padding-left: 0.2em;
      text-align: left;
      font-weight: 700;
    }
  }

  .bio {
    padding: 0 2em;
    font-size: 4vw;
    text-align: center;
  }
  .can-do {
    flex-flow: column;
    justify-content: start;
    font-size: 2.5vw;
    padding: 2em;

    .categories {
      display: grid;
      grid-template-columns: repeat(2, 50% [col-start]);
      width: 100%;
      text-align: left;
      padding-top: 1.5em;
      padding-bottom: 1em;

      div {
        display: flex;
        align-items: center;
        width: auto;
        min-width: 50%;
        font-size: 1.5em;
        span {
          margin-left: .5em;
        }
        &:nth-child(odd)  {
          justify-content: center;
        }
        &:nth-child(even) {
          justify-content: left;
          margin-left: 10%;
        }
      }
    }

    button {
      margin-top: .5em;
    }
  }

  .contact {
    flex-flow: column wrap;
    font-size: 3.5vw;

    .work {
      font-size: 1.3em;
      margin-bottom: 0.3em;
    }
  }
</style>