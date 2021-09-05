<script>
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { Section, FullVid } from '../components';
  import { currentPage } from "../stores.js";
  import { Icon, breakpoint } from '../helpers'

  let visibility = {
    one: false,
    two: false,
    three: false,
    four: false,
  }

  // TODO: move to Section component
  let y, section2, section3, section4;

  const setCurrentPage = (page) => $currentPage = page
  onMount(async () => {
    visibility['one'] = true
  });

  const scrollTest = (y) => {
    let x2 = section2?.getBoundingClientRect().top
    if( x2 < section2?.offsetHeight/3) {
      visibility['two'] = true
    }
    let x3 = section3?.getBoundingClientRect().top
    if( x3 < section3?.offsetHeight/3) {
      visibility['three'] = true
    }
    let x4 = section4?.getBoundingClientRect().top
    if( x4 < section4?.offsetHeight/3) {
      visibility['four'] = true
    }
  }

  $: scrollTest(y);
</script>

<svelte:window bind:scrollY={y}/>
<div>
  <Section colour='#212121' height='{$breakpoint === 'xs' ? 25 : 95}'>
    <div class="me text r">
      <div class="half left" >
        {#if visibility['one']}
          <div class="name" in:fly="{{x: 2000, duration: 1000}}">NIKKI <br> CADIZ</div>
        {/if}
      </div>

      <div class="half right">
        {#if visibility['one']}
          <div class="job" in:fly="{{x: -2000, duration: 1000}}">VIDEO <br> EDITOR</div>
        {/if}
      </div>
    </div>
  </Section>

  <FullVid></FullVid>

  <Section colour='--yellow' height='{$breakpoint === 'xs' ? 18 : 65}'>
    <div class="bio text f-red" bind:this={section2}>
      {#if visibility['two']}
        <span
          in:fly="{{y: 1500, duration: 500}}"
        >
          I am NIKKI CADIZ, a freelance video editor based in the Philippines. I am available for both short-term and long-term projects.
        </span>
      {/if}
    </div>
  </Section>

  <Section colour='--red-light' height='{$breakpoint === 'xs' ? 18 : 65}'>
    <div class="can-do text f-blue" bind:this={section3}>
      {#if visibility['three']}
        <div class="intro" in:fly="{{y: -1500, duration: 500}}">I edit...</div>
        <div class="categories">
          <div in:fade="{{duration: 650, delay: 250}}">
            <Icon name='testimony' fill='#355C7D' />
            <span>TESTIMONIALS</span>
          </div>
          <div in:fade="{{duration: 650, delay: 750}}">
            <Icon name='advert' fill='#355C7D' />
            <span>ADVERTISEMENTS</span>
          </div>
          <div in:fade="{{duration: 650, delay: 500}}">
            <Icon name='music' fill='#355C7D' />
            <span>MUSIC VIDEOS</span>
          </div>
          <div in:fade="{{duration: 650, delay: 1000}}">
            <Icon name='webclass' fill='#355C7D' />
            <span>WEBCLASSES</span>
          </div>
        </div>
        <div class="intro" in:fly="{{y: 1500, duration: 2500}}">... and more!</div>
        <button on:click={() => setCurrentPage('Videos')} in:fly="{{y: 1500, duration: 3000}}">VIEW PORTFOLIO</button>
      {/if}
    </div>
  </Section>

  <Section colour='--indigo' height='{$breakpoint === 'xs' ? 18 : 75}'>
    <div class="contact text f-yellow" bind:this={section4}>
      {#if visibility['four']}
        <div class="work c" in:fly="{{y: 1500, duration: 1000}}">LET'S WORK TOGETHER!</div>
        <div class="email r" in:fly="{{y: 1500, duration: 2500}}">nikkitries@gmail.com</div>
      {/if}
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
    justify-content: center;
    font-size: 2.5vw;
    font-weight: 600;

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
        font-weight: 700;
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
      border-width: 3px;
      font-weight: 800;
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