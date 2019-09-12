#ifndef __BRK_MAXIMAL_H
#define __BRK_MAXIMAL_H

#include <thai/thailib.h>
#include <thai/thbrk.h>

typedef struct _BrkEnv BrkEnv;

BrkEnv *
brk_env_new (ThBrk *brk);

void
brk_env_free (BrkEnv *env);

int
brk_maximal_do (const thchar_t *s, int len, int pos[], size_t n, int inc[], size_t inc_n, int *inc_ret, BrkEnv *env);

#endif /* __BRK_MAXIMAL_H */
