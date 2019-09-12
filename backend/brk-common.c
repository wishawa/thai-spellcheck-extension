#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <datrie/trie.h>
#include <thai/tis.h>
#include <thai/thctype.h>
#include "thbrk-utils.h"
#include "brk-common.h"

#define DICT_NAME   "thbrk"
#define DICT_DIR   "/"

static char *
full_path (const char *path, const char *name, const char *ext)
{
    int full_size = strlen (path) + strlen (name) + strlen (ext) + 2;
    char *full_path_buff = (char *) malloc (full_size);
    sprintf (full_path_buff, "%s/%s%s", path, name, ext);
    return full_path_buff;
}

Trie *
brk_load_default_dict ()
{
    const char *dict_dir;
    Trie       *dict_trie = NULL;

    /* Try LIBTHAI_DICTDIR env first */
    dict_dir = getenv ("LIBTHAI_DICTDIR");
    if (dict_dir) {
        char *path = full_path (dict_dir, DICT_NAME, ".tri");
        dict_trie = trie_new_from_file (path);
        free (path);
    }

    /* Then, fall back to default DICT_DIR macro */
    if (!dict_trie) {
        dict_trie = trie_new_from_file (DICT_DIR "/" DICT_NAME ".tri");
    }

    return dict_trie;
}

void
brk_brkpos_hints (const thchar_t *str, int len, char *hints)
{
    int  i;

    if (len < 0)
        len = strlen ((const char *)str);

    memset (hints, 0, len);

    for (i = 0; i < len; /* nop */) {
        if (th_isthcons (str[i])) {
            if (i+1 < len && str[i+1] == TIS_THANTHAKHAT) {
                i += 2; /* the cons + THANTHAKHAT */
            } else if (i+2 < len && str[i+2] == TIS_THANTHAKHAT) {
                i += 3; /* the cons + intermediate char + THANTHAKHAT */
            } else if (i+2 < len
                       && str[i] != TIS_KO_KAI && str[i+1] == TIS_MAITAIKHU
                       && (str[i+2] == TIS_O_ANG || str[i+2] == TIS_WO_WAEN))
            {
                hints[i] = 1;
                i += 4; /* the cons + MAITAIKHU + OANG/WOWAEN + cons */
            } else if ((i > 0
                        && (str[i-1] == TIS_MAI_HAN_AKAT
                            || str[i-1] == TIS_SARA_UEE))
                       || (i > 1 && th_isthtone (str[i-1])
                           && (str[i-2] == TIS_MAI_HAN_AKAT
                               || str[i-2] == TIS_SARA_UEE)))
            {
                i++;
            } else {
                hints[i++] = 1;
            }
        } else if (str[i] == TIS_SARA_E || str[i] == TIS_SARA_AE) {
            hints[i] = 1; /* sara e/ae */
            i += 2; /* sara e/ae + the supposedly cons */
            if (i >= len)
                break;
            if (str[i] == TIS_MAITAIKHU) {
                i += 2; /* MAITAIKHU + the supposedly cons */
            } else if (th_isupvowel (str[i])) {
                i++; /* the upper vowel, as part of composite vowel */
                if (i < len && th_isthtone (str[i]))
                    i++;
                i++; /* the supposedly cons */
            } else if (i+2 < len
                       && ((str[i+1] == TIS_SARA_AA && str[i+2] == TIS_SARA_A)
                            || (str[i] != TIS_KO_KAI
                                && str[i+1] == TIS_MAITAIKHU
                                && str[i+2] != TIS_O_ANG
                                && str[i+2] != TIS_WO_WAEN)))
            {
                i += 3; /* 2nd cons + SARA_AA + SARA_A, or
                         * 2nd cons + MAITAIKHU + final cons
                         */
            }
        } else if (th_isldvowel (str[i])) {
            hints[i] = 1; /* the ldvowel */
            i += 2; /* the ldvowel + the supposedly cons */
        } else if (str[i] == TIS_RU || str[i] == TIS_LU) {
            hints[i++] = 1;
        } else {
            i++;
        }
    }
}

