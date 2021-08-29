<script>
	import { currentPage, modal } from "./stores.js";
	import Modal from 'svelte-simple-modal';

	import { About, Home, Videos} from './pages';
	import { Navbar } from './components';
	import { PageTransition } from './helpers';
</script>

<main>
	<Navbar />

	{#if $currentPage === 'Home'}
		<Home />
	{:else if $currentPage === 'About'}
		<PageTransition>
			<About />
		</PageTransition>
	{:else if $currentPage === 'Videos'}
		<PageTransition>
			<Videos />
		</PageTransition>
	{/if}


	<!-- YouTube Modal -->
	<Modal
		show={$modal}
		styleWindow= {{
			width: 'auto',
			textAlign: 'center',
    	backgroundColor: 'black'
		}}
		styleContent={{
			padding: 0
		}}
	>
  </Modal>

</main>

<style>
	/* COLOURS */
	:global(:root){
		--black: #212121;
		--white: #EFEFEF;
		--yellow: #FBB195;
		--red: #F67280;
		--red-light: #C06C84;
		--indigo: #6C5B7B;
		--blue: #355C7D;
	}
</style>