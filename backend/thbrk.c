#include <string.h>
#include <stdlib.h>
#include <stdint.h>
#include <datrie/trie.h>
#include <thai/tis.h>
#include <thai/thctype.h>
#include <thai/thbrk.h>
#include "thbrk-priv.h"
#include "thbrk-utils.h"
#include "brk-ctype.h"
#include "brk-maximal.h"
#include "brk-common.h"
#include "emscripten.h"

#define MAX_ACRONYM_FRAG_LEN  3

EMSCRIPTEN_KEEPALIVE
ThBrk *
th_brk_new (const char *dictpath)
{
    ThBrk *     brk;
    Trie *      dict_trie;

    brk = (ThBrk *) malloc (sizeof (ThBrk));
    if (UNLIKELY (!brk)) {
        return NULL;
    }

    if (dictpath) {
        dict_trie = trie_new_from_file (dictpath);
    } else {
        dict_trie = brk_load_default_dict ();
    }
    if (UNLIKELY (!dict_trie)) {
        free (brk);
        return NULL;
    }

    brk->dict_trie = dict_trie;
    
    return brk;
}


EMSCRIPTEN_KEEPALIVE
void
th_brk_delete (ThBrk *brk)
{
    trie_free (brk->dict_trie);
    free (brk);
}


EMSCRIPTEN_KEEPALIVE
int
th_brk_find_breaks (ThBrk *brk, const thchar_t *s, int pos[], size_t pos_sz, int inc[], int *inc_ret)
{
    BrkEnv         *env;
    brk_class_t     prev_class, effective_class;
    const thchar_t *thai_chunk, *acronym_end, *p;
    int             cur_pos, inc_cur_pos;

    if (!*s) {
        *inc_ret = 0;
        return 0;
    }

    p = thai_chunk = acronym_end = s;
    prev_class = effective_class = brk_class (*p);
    cur_pos = 0;
    inc_cur_pos = 0;

    env = brk_env_new (brk);

    while (*++p && cur_pos < pos_sz) {
        brk_class_t  new_class;
        brk_op_t     op;

        new_class = brk_class (*p);
        op = brk_op (effective_class, new_class);

        if (BRK_CLASS_THAI == prev_class) {
            /* handle acronyms */
            if ('.' == *p && p - acronym_end <= MAX_ACRONYM_FRAG_LEN) {
                /* the fullstop after Thai is part of Thai acronym */
                new_class = BRK_CLASS_THAI;
                acronym_end = p + 1;
            } else if (acronym_end > thai_chunk) {
                /* an acronym was marked */
                if (BRK_CLASS_THAI != new_class
                    || p - acronym_end > MAX_ACRONYM_FRAG_LEN)
                {
                    /* end of Thai chunk or entered non-acronym Thai word,
                     * jump back to the acronym end */
                    prev_class = effective_class = brk_class ('.');
                    p = thai_chunk = acronym_end;
                    new_class = brk_class (*p);
                    op = brk_op (effective_class, new_class);
                }
            }

            /* break chunk if leaving Thai chunk */
            if (BRK_CLASS_THAI != new_class && p > thai_chunk) {
                int n_brk, i;
                int n_inc = 0;

                n_brk = brk_maximal_do (thai_chunk, p - thai_chunk,
                                        pos + cur_pos, pos_sz - cur_pos,
                                        inc + inc_cur_pos, pos_sz - inc_cur_pos, &n_inc,
                                        env);
                for (i = 0; i < n_brk; i++) {
                    pos [cur_pos + i] += thai_chunk - s;
                }
                for (i = 0; i < n_inc; i++) {
                    inc [inc_cur_pos + i] += thai_chunk - s;
                }
                cur_pos += n_brk;
                inc_cur_pos += n_inc;

                /* remove last break if at string end
                 * note that even if it's allowed, the table-lookup
                 * operation below will take care of it anyway
                 */
                if (LIKELY (cur_pos > 0) && pos[cur_pos - 1] == p - s)
                    --cur_pos;
                
                /*if (LIKELY (inc_cur_pos > 0) && inc[inc_cur_pos - 1] == p - s)
                    --inc_cur_pos;REMOVE*/

                if (cur_pos >= pos_sz)
                    break;
            }
        } else {
            /* set chunk if entering Thai chunk */
            if (BRK_CLASS_THAI == new_class)
                thai_chunk = acronym_end = p;
        }

        switch (op) {
        case BRK_OP_ALLOWED:
            if ('\n' == *p && '\r' == *(p - 1))
                break;

            pos [cur_pos++] = p - s;
            break;
        case BRK_OP_INDIRECT:
            /* assert (BRK_CLASS_SPACE != new_class); */
            if (BRK_CLASS_SPACE == prev_class)
                pos [cur_pos++] = p - s;
            break;
        default:
            break;
        }

        prev_class = new_class;
        if (BRK_OP_ALLOWED == op || BRK_CLASS_SPACE != new_class)
            effective_class = new_class;
    }

    /* break last Thai non-acronym chunk */
    if (BRK_CLASS_THAI == prev_class && acronym_end <= thai_chunk
        && cur_pos < pos_sz)
    {
        int n_brk, i;
        int n_inc = 0;

        n_brk = brk_maximal_do (thai_chunk, p - thai_chunk,
                                pos + cur_pos, pos_sz - cur_pos,
                                inc + inc_cur_pos, pos_sz - inc_cur_pos, &n_inc,
                                env);
        for (i = 0; i < n_brk; i++) {
            pos [cur_pos + i] += thai_chunk - s;
        }
        for (i = 0; i < n_inc; i++) {
            inc [inc_cur_pos + i] += thai_chunk - s;
        }
        cur_pos += n_brk;
        inc_cur_pos += n_inc;

        /* remove last break if at string end */
        if (pos[cur_pos - 1] == p - s)
            --cur_pos;
        /*if (LIKELY (inc_cur_pos > 0) && inc[inc_cur_pos - 1] == p - s)
            --inc_cur_pos;REMOVE*/
    }

    brk_env_free (env);
    *inc_ret = inc_cur_pos;

    return cur_pos;
}
