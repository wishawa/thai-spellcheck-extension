#ifndef __THBRK_PRIV_H
#define __THBRK_PRIV_H

#include <datrie/trie.h>
#include <thai/thbrk.h>

struct _ThBrk {
    Trie           *dict_trie;
};


#endif  /* __THBRK_PRIV_H */
