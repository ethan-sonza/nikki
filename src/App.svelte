<script>
	import { currentPage, modal } from "./stores.js";

	import Modal from 'svelte-simple-modal';

	import { About, Home, Videos} from './pages';
	import { Navbar } from './components';
</script>

<main>
	<Navbar />

	{#if $currentPage === 'Home'}
		<Home />
	{:else if $currentPage === 'About'}
		<About />
	{:else if $currentPage === 'Videos'}
		<Videos />
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
	}
</style>