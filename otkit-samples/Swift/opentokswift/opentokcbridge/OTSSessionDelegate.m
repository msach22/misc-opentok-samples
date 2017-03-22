//
//  OTSSessionDelegate.m
//  opentok
//
//  Created by rpc on 16/02/15.
//  Copyright (c) 2015 tokbox. All rights reserved.
//

#import "OTSSessionDelegate.h"
@import opentokc;

static OTSSessionDelegate *instance = nil;

void on_connected(otc_session *session, void *user_data) {
    if (instance && instance.connected) {
        instance.connected();
    }
}

@implementation OTSSessionDelegate {
    otc_session_cb callbacks;
}

- (id)init
{
    self = [super init];
    if (self) {
        callbacks.on_connected = on_connected;
        instance = self;
    }
    return self;
}

- (otc_session_cb *)cCallbackWrapper
{
    return &callbacks;
}

@end
