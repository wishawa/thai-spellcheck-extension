#include <string.h>
#include <stdint.h>
#include <stdlib.h>

#include <thai/thailib.h>
#include <thai/thwchar.h>
#include <thai/thbrk.h>

#include "emscripten.h"


EMSCRIPTEN_KEEPALIVE
int
th_brk_wc_find_breaks (ThBrk *brk, const thwchar_t *s, int pos[], size_t pos_sz, int inc[], int *inc_ret)
{
    thchar_t*   tis_str;
    size_t      alloc_size;
    int         ret;

    
    /* convert to tis-620 string */
    //alloc_size = strlen ((char *)s)/2 + 1;
    int e = 0;
    while (s[e]) ++e;
    alloc_size = e + 1;
    tis_str = malloc (alloc_size);
    
    if (!tis_str)
        return 0;
    th_uni2tis_line (s, tis_str, alloc_size);


    /* do word break */
    ret = th_brk_find_breaks (brk, tis_str, pos, pos_sz, inc, inc_ret);

    free (tis_str);

    return ret;
}
