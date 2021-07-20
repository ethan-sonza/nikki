<script>
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { Section, FullVid } from '../components';
  import { currentPage } from "../stores.js";
  import { Icon } from '../helpers'

  let visible = false;
  const setCurrentPage = (page) => $currentPage = page
  onMount(async () => {
    visible = true
  });
</script>

<div>
  <!-- <Parallax sections={2.2}> -->
  <!-- <ParallaxLayer offset={0} rate={.5}> -->
  <Section colour='#212121' height='95'>
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
  <Section colour='#212121' height='100'>
    <FullVid></FullVid>
  </Section>

  <Section colour='#EFEFEF' height='65'>
    <div class="can-do itext">
      <div class="intro">I edit...</div>
      <div class="categories">
        <div>
          <Icon name='testimony' />
          <span>TESTIMONIALS</span>
        </div>
        <div>
          <Icon name='advert' />
          <span>ADVERTISEMENTS</span>
        </div>
        <div>
          <Icon name='music' />
          <span>MUSIC VIDEOS</span>
        </div>
        <div>
          <Icon name='webclass' />
          <span>WEBCLASSES</span>
        </div>
      </div>
      <div class="intro">... and more!</div>
      <button on:click={() => setCurrentPage('Videos')}>VIEW PORTFOLIO</button>
    </div>
  </Section>

  <Section colour='#212121' height='65'>
    <div class="bio text">
      I am NIKKI CADIZ, a freelance video editor based in the Philippines. I am available for both short-term and long-term projects.
    </div>
  </Section>

  <Section colour='#EFEFEF' height='75'>
    <div class="contact itext">
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
      color: var(--black);
      background-color: var(--white);
      padding-right: 0.2em;
      text-align: right;
      font-weight: 800;
    }

    &.right {
      justify-content: flex-start;
      color: var(--white);
      background-color: var(--black);
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
    padding: 1em 2em;

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
        &:nth-child(odd)  { margin-left: 3em; }
        &:nth-child(even) { padding-left: 1em; }
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