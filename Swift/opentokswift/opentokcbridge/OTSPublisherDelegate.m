//
//  OTSPublisherDelegate.m
//  opentok
//
//  Created by rpc on 16/02/15.
//  Copyright (c) 2015 tokbox. All rights reserved.
//

#import "OTSPublisherDelegate.h"
@import ObjectiveC;
@import opentokc;

static OTSPublisherDelegate *instance = nil;

void on_render_frame(struct otc_publisher *publisher, void *user_data, otc_video_frame *frame)
{
    if (instance && instance.renderFrame) {
        instance.renderFrame(frame);
    }
}

@implementation OTSPublisherDelegate {
    struct otc_publisher_cb callbacks;
}

- (id)init {
    self = [super init];
    if (self) {
        callbacks.on_render_frame = on_render_frame;
        instance = self;
    }
    return self;
}

- (otc_publisher_cb *)cCallbackWrapper {
    return &callbacks;
}

@end
