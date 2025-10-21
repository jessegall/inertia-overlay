import { ref } from "vue";

export function useCounter() {

    const count = ref(0);

    function next() {
        count.value += 1;
        return count.value;
    }

    return {
        next,
    }

}