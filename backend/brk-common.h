#ifndef __BRK_COMMON_H
#define __BRK_COMMON_H

#include <thai/thctype.h>
#include <datrie/trie.h>

Trie *  brk_load_default_dict ();

void    brk_brkpos_hints (const thchar_t *str, int len, char *hints);

#endif  /* __BRK_COMMON_H */
