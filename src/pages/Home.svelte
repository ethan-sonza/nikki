<script>
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { Parallax, ParallaxLayer } from 'svelte-parallax';
  import { Section, YouTubePreview, FullVid } from '../components';
  import { lazyLoad, typewriter } from '../helpers';

  let visible, show_body, show_button = false;
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
    },
  ]

  onMount(async () => {
    visible = true
    setTimeout(function(){
      show_body = true
    }, 4000);
  });
</script>

<Parallax sections={2.2}>
  <Section colour='#212121'>
    {#if visible}
      <img id='landing-person' in:fade="{{ duration: 2000 }}" use:lazyLoad={'/images/landing1.jpg'} alt='landing-person' />

      <div class="about">
        <p class="m" in:typewriter="{{speed: 75}}" on:outroend="{() => alert('outro ended')}">
          I'm NIKKI, I like big DIKKI, a video editor lorem...
        </p>

        {#if show_body}
          <div in:typewriter="{{speed: 35}}">
            Lorem, ipsum dolor sit amet consectetur adipisicing elit. Provident est, ea pariatur similique
            dolor unde molestias vitae sequi modi totam accusantium ratione aliquam?
            Pariatur vel alias iste sequi dignissimos qui.
          </div>
        {/if}
      </div>
    {/if}
  </Section>

  <ParallaxLayer offset={0} rate={.5}>
    <FullVid></FullVid>
  </ParallaxLayer>

	<ParallaxLayer offset={.8} rate={.3}>
		<Section colour='#ff6961'>
      <div class="videos">
        {#each videos as { id, category }}
          <YouTubePreview videoId={id} category={category} />
        {/each}
      </div>

      <div class="contact">
        <div class='half left'>
          <span style="
            font-family: 'Montserrat';
            font-size: 8em;
          ">
            WORK
          </span>
          <br/>
          <span style="
            font-family: 'Open Sans';
            font-size: 6em;
            line-height: 0.4;
            letter-spacing: 0.08em;
            text-align: right;
          ">
            with me
          </span>
        </div>

        <div class='half right'>
          <b>NOTES</b> <br/>
          - Only got this page, and a very simple parallax-thing going <br/>
          &nbsp; - Simple example of maximizing parallax's potential: 
            <a href='https://svelte.dev/repl/1504d411044745a186004855521a89c7?version=3.35.0' target="_blank">LINK</a> <br/>
          - Will work on the other pages next just to get the placements of things <br/>
          - Be absolutely honest with me if you have any changes, <br/>
          &nbsp;&nbsp; I don't do a lot of designing so the feedback will be helpful <br/>
          - Also, this will be the 'contact me' form (eg. send email, socials)
        </div>
      </div>
    </Section>
	</ParallaxLayer>
</Parallax>
<style>
  img#landing-person {
    margin-left: 10%;
  }
  .about {
    position: absolute;
    top: 20%;
    left: 45%;
    color: #EFEFEF;
    font-size: 2em;
    width: 50%;
  }

  .m {
    font-family: Montserrat, sans-serif;
    font-weight: 600;
    font-size: 1.2em;
  }

  .videos {
    max-width: 100%;
    display: flex;
    justify-content: space-evenly;
  }

  .contact {
    display: flex;
    height: 55%;
  }

  .half {
    width: 50%;
    margin: auto 0;
  }
  .half.left {
    text-align: right;
    padding-right: 1em;
  }
  .half.right {
    font-size: 1.5em;
  }
</style>