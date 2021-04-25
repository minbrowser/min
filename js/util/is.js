/**
  * If i need to check data types or any thing like that
  * first, add here that funciton, then import in target file,
  * next, use function
  * WHY : I saw many data type checking for usable (not undefined) in this browser used but they are be only function
  */

const type = (value) => typeof value;
const is = {
  notEmpty: (value) => type(value) !== undefined, // or rename to `empty` => in usage => `if(!is.empty(...));` for module `if(is.notEmpty(module))`
  // ... and etc. do you think you want
  // but i read the codes, and if find any thing else of undefined, i add them here, and you just need to importing or tell me :huge:
};
